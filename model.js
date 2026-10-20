export const blank = () => ({ version: 1, name: 'Studio VideoHub', inputs: Array.from({length:40}, () => ({label:'',location:'',notes:''})), outputs: Array.from({length:40}, () => ({label:'',location:'',notes:''})) });
export function validate(data) {
  if (!data || data.version !== 1 || typeof data.name !== 'string' || data.name.length > 200) throw new Error('This is not a supported Video Router Matrix backup.');
  const result = blank();
  result.name = data.name;
  for (const side of ['inputs','outputs']) {
    if (!Array.isArray(data[side]) || data[side].length !== 40) throw new Error('A backup must contain exactly 40 inputs and 40 outputs.');
    result[side] = data[side].map(port => {
      const clean = {};
      for (const key of ['label','location','notes']) {
        if (!port || typeof port[key] !== 'string' || port[key].length > 2000) throw new Error('The backup contains invalid port details.');
        clean[key] = port[key];
      }
      return clean;
    });
  }
  return result;
}
