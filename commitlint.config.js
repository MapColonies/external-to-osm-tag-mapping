module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['schemas', 'deps', 'configurations', 'helm']],
  },
};
