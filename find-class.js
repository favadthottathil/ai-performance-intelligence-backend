import fs from 'fs';

const filePath = 'c:\\Users\\HP\\Desktop\\ai-performance_backend\\node_modules\\@google\\genai\\dist\\node\\index.mjs';
const searchString = 'class GoogleGenAI';

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes(searchString)) {
        console.log(`Found on line ${index + 1}: ${line.trim()}`);
    }
});
