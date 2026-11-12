import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

for (const file of ['ci', 'deploy']) {
  const workflow = parse(readFileSync(`.github/workflows/${file}.yml`, 'utf8'));
  test(`${file}: build/test jobs cannot publish or mint OIDC tokens`, () => {
    assert.deepEqual(workflow.permissions, { contents: 'read' });
    for (const [name, job] of Object.entries(workflow.jobs)) {
      if (name === 'deploy') continue;
      assert.deepEqual(job.permissions ?? workflow.permissions, { contents: 'read' });
      assert.ok(job.steps.some(step => step.run === 'npm run test:security'));
    }
  });
  test(`${file}: all actions are pinned and checkout does not leave credentials`, () => {
    for (const job of Object.values(workflow.jobs)) for (const step of job.steps) {
      if (!step.uses) continue;
      assert.match(step.uses, /^actions\/[a-z-]+@[a-f0-9]{40}$/);
      if (step.uses.startsWith('actions/checkout@')) assert.equal(step.with['persist-credentials'], false);
    }
  });
  if (file === 'deploy') test('only the isolated deploy job can publish', () => {
    assert.deepEqual(workflow.jobs.deploy.permissions, { pages: 'write', 'id-token': 'write' });
    assert.equal(workflow.jobs.deploy.needs, 'build');
    assert.ok(!workflow.jobs.deploy.steps.some(step => step.run));
    const build = workflow.jobs.build.steps;
    assert.ok(build.some(step => step.run?.includes('tar --dereference --hard-dereference --directory dist')));
    const upload = build.find(step => step.with?.name === 'github-pages');
    assert.equal(upload.with.path, '${{ runner.temp }}/artifact.tar');
    assert.equal(upload.with['if-no-files-found'], 'error');
  });
}
