export const blank = () => ({ version: 2, name: 'Studio VideoHub', inputs: Array.from({length:40}, () => ({label:'',location:'',notes:''})), outputs: Array.from({length:40}, () => ({label:'',location:'',notes:''})), routes: Array(40).fill(null) });
export function validate(data) {
  if (!data || ![1,2].includes(data.version) || typeof data.name !== 'string' || data.name.length > 200) throw new Error('This is not a supported Video Router Matrix backup.');
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
  if (data.version === 2) {
    if (!Array.isArray(data.routes) || data.routes.length !== 40 || !Array.from(data.routes).every(source => source === null || (Number.isInteger(source) && source >= 1 && source <= 40))) throw new Error('Routes must contain one input number (1–40) or null for each of the 40 outputs.');
    result.routes = [...data.routes];
  }
  return result;
}

// Each output has one documented source; an input may feed multiple outputs.
export function toggleRoute(data, input, output) {
  if (![input, output].every(port => Number.isInteger(port) && port >= 1 && port <= 40)) throw new Error('Invalid port number.');
  data.routes[output - 1] = data.routes[output - 1] === input ? null : input;
}
