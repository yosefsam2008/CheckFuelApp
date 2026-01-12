#!/usr/bin/env node

/**
 * Script to wrap all console.log statements with __DEV__ guards
 * Skips console.error and console.warn (should always be active)
 */

const fs = require('fs');
const path = require('path');

const DIRECTORIES = ['app', 'components', 'lib', 'hooks', 'api'];
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

let totalFilesModified = 0;
let totalLogsWrapped = 0;
const modifiedFiles = [];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      const ext = path.extname(file);
      if (EXTENSIONS.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function wrapConsoleLogs(content) {
  let modified = false;
  let logsWrapped = 0;

  // Pattern to match console.log statements (not console.error or console.warn)
  // Handles single-line and multi-line console.log
  const lines = content.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip if already wrapped with __DEV__
    if (trimmed.startsWith('if (__DEV__)') || trimmed.includes('if(__DEV__)')) {
      result.push(line);
      i++;
      continue;
    }

    // Check if line contains console.log (not console.error or console.warn)
    const consoleLogMatch = line.match(/^(\s*)console\.log\(/);

    if (consoleLogMatch && !trimmed.startsWith('//')) {
      const indent = consoleLogMatch[1];

      // Check if it's already wrapped by looking at previous line
      const prevLine = result.length > 0 ? result[result.length - 1] : '';
      if (prevLine.trim().includes('if (__DEV__)') || prevLine.trim().includes('if(__DEV__)')) {
        result.push(line);
        i++;
        continue;
      }

      // Find the complete console.log statement (might span multiple lines)
      let consoleStatement = line;
      let openParens = (line.match(/\(/g) || []).length;
      let closeParens = (line.match(/\)/g) || []).length;
      let j = i + 1;

      while (openParens > closeParens && j < lines.length) {
        consoleStatement += '\n' + lines[j];
        openParens += (lines[j].match(/\(/g) || []).length;
        closeParens += (lines[j].match(/\)/g) || []).length;
        j++;
      }

      // Wrap the console.log with __DEV__
      result.push(`${indent}if (__DEV__) {`);

      // Add the console statement(s) with extra indentation
      const statementLines = consoleStatement.split('\n');
      statementLines.forEach(l => {
        result.push(`${indent}  ${l.trimStart()}`);
      });

      result.push(`${indent}}`);

      modified = true;
      logsWrapped++;
      i = j;
    } else {
      result.push(line);
      i++;
    }
  }

  return {
    content: result.join('\n'),
    modified,
    logsWrapped
  };
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = wrapConsoleLogs(content);

  if (result.modified) {
    fs.writeFileSync(filePath, result.content, 'utf8');
    totalFilesModified++;
    totalLogsWrapped += result.logsWrapped;
    modifiedFiles.push({
      path: filePath,
      logsWrapped: result.logsWrapped
    });
    console.log(`✓ ${filePath} - Wrapped ${result.logsWrapped} console.log(s)`);
  }
}

function main() {
  console.log('🔍 Searching for console.log statements...\n');

  DIRECTORIES.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      const files = getAllFiles(dirPath);
      console.log(`📁 ${dir}/ - Found ${files.length} files`);
      files.forEach(processFile);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files modified: ${totalFilesModified}`);
  console.log(`Total console.log statements wrapped: ${totalLogsWrapped}`);

  if (modifiedFiles.length > 0) {
    console.log('\n📝 Modified files:');
    modifiedFiles.forEach(f => {
      console.log(`   ${f.path} (${f.logsWrapped} logs)`);
    });
  }

  console.log('\n✅ Done!');
}

main();
