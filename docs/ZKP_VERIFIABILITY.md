# SSS 零知识证明（ZKP）可验证性

本项目在后端 Shamir 秘密共享（Shamir Secret Sharing）流程中引入了类似零知识证明（ZKP）的可验证机制：

涉及文件：

* `backend/src/crypto/shamir.ts`
* `backend/src/services/legacyPlanService.ts`

---

## 生成（Generation）

当创建遗产计划（legacy plan）时，后端会生成一个主密钥（master key），并将其拆分为 `n` 份 Shamir 份额（shares）。

每个 share 现在都包含公开验证材料：

* `commitment`：椭圆曲线承诺（EC commitment），`Y_i = y_i * G`
* `polynomialCommitments`：Feldman 多项式系数承诺
  `A_j = a_j * G`
* `proof`：基于 Schnorr 的非交互式零知识证明，用于证明持有该 share 的值

真实的 `value` 只发送给对应的 guardian，不会持久化存储在 `plans.json` 中。

上述公共字段会与计划一起存储。

---

## 提交（Submission）

当 guardian 通过接口提交 share：

```
/api/inheritance/share
```

服务端会调用：

```ts
shamirSecretSharing.verifyShareProof(tempShare, storedShare)
```

验证器会检查：

1. 提交的 `value` 是否与其椭圆曲线承诺 `commitment` 匹配
2. share 的承诺是否与多项式承诺（polynomial commitments）一致
3. Schnorr 零知识证明是否有效

如果 share 被修改哪怕一个十六进制字符，验证都会失败，在进入恢复流程前就被拒绝。

---

## 恢复（Recovery）

接口：

```
/api/inheritance/recover
```

在恢复阶段，同样会对所有提供的 shares 逐个进行验证，然后才执行 Lagrange 插值重构 master key。

这可以防止攻击者绕过 guardian 提交接口，直接注入伪造 share。

---

## 域与群阶（Field And Group Order）

在基于 secp256k1 的 Feldman VSS 中，Shamir 多项式是在椭圆曲线标量域 `Z_q` 上进行计算的，其中 `q` 是 secp256k1 的群阶。

Schnorr 协议中的挑战值和响应值也都在 `q` 模意义下计算。

这样设计是为了保证 VSS 等式成立：

```text
f(x_i) * G == A_0 + A_1*x_i + ... + A_t*x_i^t
```

---

该实现不会混用椭圆曲线基域素数与群阶。

旧版本的计划仍然兼容，通过单独的 legacy combine 函数处理旧 share 恢复（仅用于旧数据）。

---

## 演示要点（Demo Points）

* 新建 plan 的 `shares` 包含：

  * `commitment`
  * `proof`
  * `polynomialCommitments`
  * 但不包含 `value`

* 正确 guardian 提交的 share：验证通过

* 被篡改的 share：返回
  `Invalid share value or zero-knowledge proof`

* 只有验证通过的 share 才会参与 master key 重构
