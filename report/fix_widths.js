const fs = require('fs');
let content = fs.readFileSync('report.tex', 'utf8');

// Fix caption centering
content = content.replace(
    '\\captionsetup{font=small,labelfont=bf}',
    '\\captionsetup{font=small,labelfont=bf,justification=centering}'
);

// Fix figure widths - tall diagrams need narrower width to fit one page
const replacements = {
    'figures/fig_overview.png': '0.72',
    'figures/fig_architecture.png': '0.68',
    'figures/fig_createflow.png': '0.65',
    'figures/fig_lifecycle.png': '0.65',
    'figures/fig_verifypipe.png': '0.70',
    'figures/fig_protocol.png': '0.72',
};

for (const [figFile, newWidth] of Object.entries(replacements)) {
    // Match: \includegraphics[width=\textwidth]{figures/fig_xxx.png}
    const re = new RegExp('(\\\\includegraphics\\[width=)\\\\textwidth(\\]\\{' + figFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\})', 'g');
    const before = (content.match(re) || []).length;
    content = content.replace(re, '$1' + newWidth + '\\textwidth$2');
    const after = (content.match(re) || []).length;
    console.log(figFile + ': ' + before + ' replaced');
}

fs.writeFileSync('report.tex', content);
console.log('Done');
