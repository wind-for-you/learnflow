/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function exists(relativePath) {
  return fs.existsSync(path.resolve(__dirname, '..', relativePath));
}

function run() {
  const checks = [
    {
      name: 'OpenAPI 合同存在',
      pass: exists('../docs/api/openapi.yaml'),
      hint: '缺少 docs/api/openapi.yaml',
    },
    {
      name: 'MVP 主链路测试基线存在',
      pass: exists('../docs/product/planning/10-mvp-mainflow-test-baseline.md'),
      hint: '缺少 docs/product/planning/10-mvp-mainflow-test-baseline.md',
    },
    {
      name: 'AI 质量门禁文档存在',
      pass: exists('../docs/product/planning/11-ai-quality-gate.md'),
      hint: '缺少 docs/product/planning/11-ai-quality-gate.md',
    },
    {
      name: '回滚演练文档存在',
      pass: exists('../docs/product/planning/12-release-rollout-and-rollback-runbook.md'),
      hint: '缺少 docs/product/planning/12-release-rollout-and-rollback-runbook.md',
    },
  ];

  let failed = 0;
  console.log('Release Gate Check:');
  checks.forEach((check) => {
    if (check.pass) {
      console.log(`  PASS - ${check.name}`);
    } else {
      failed += 1;
      console.log(`  FAIL - ${check.name} (${check.hint})`);
    }
  });

  if (failed > 0) {
    console.log(`\nRelease Gate FAILED: ${failed} checks failed.`);
    process.exit(1);
  }

  console.log('\nRelease Gate PASSED.');
}

run();
