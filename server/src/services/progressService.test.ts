import { countAiTasks } from './progressService';

describe('countAiTasks', () => {
  it('returns 0 when content is null', () => {
    expect(countAiTasks(null)).toBe(0);
  });

  it('returns 0 when content is invalid JSON', () => {
    expect(countAiTasks('not-json')).toBe(0);
  });

  it('counts tasks from weeklyPlans JSON content', () => {
    const content = JSON.stringify([
      { week: 1, tasks: [{}, {}] },
      { week: 2, tasks: [{}] },
      { week: 3, tasks: [] },
    ]);

    expect(countAiTasks(content)).toBe(3);
  });
});
