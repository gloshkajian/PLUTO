import Ember from 'ember';

export function ruleErrorTable(params, {rule, log}) {
  const ruleFileName = typeof rule === 'string' ? rule : rule.get('filename');

  var result = '';
  log.get('reports').forEach((report) => {
    const reportFile = report.get('problemFile');
    if (reportFile == ruleFileName)
      result += `<tr><td>${report.get('logType')}</td><td>${report.get('description')}</td></tr>`;
  });
  if (result.length > 0)
    result = `<table border="1">${result}</table>`;

  return Ember.String.htmlSafe(result);
}

export default Ember.Helper.helper(ruleErrorTable);