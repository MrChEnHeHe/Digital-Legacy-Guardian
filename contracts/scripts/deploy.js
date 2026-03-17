const hre = require("hardhat");

async function main() {
  console.log("Deploying LegacyContract...");

  const LegacyContract = await hre.ethers.getContractFactory("LegacyContract");
  const contract = await LegacyContract.deploy();

  await contract.deployed();

  console.log("LegacyContract deployed to:", contract.address);

  // Save contract address to .env
  const fs = require('fs');
  const envPath = '../backend/.env';
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Update or add CONTRACT_ADDRESS
  const lines = envContent.split('\n');
  let addressLineFound = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('CONTRACT_ADDRESS=')) {
      lines[i] = `CONTRACT_ADDRESS=${contract.address}`;
      addressLineFound = true;
      break;
    }
  }
  
  if (!addressLineFound) {
    lines.push(`CONTRACT_ADDRESS=${contract.address}`);
  }
  
  fs.writeFileSync(envPath, lines.join('\n'));
  console.log("Contract address saved to backend/.env");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
