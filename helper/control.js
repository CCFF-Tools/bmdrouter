import { randomUUID } from 'node:crypto';
import { validate } from '../model.js';
import { sections } from './protocol.js';

export class Control {
  constructor(router) { this.router = router; this.plans = new Map(); }
  preview(request) {
    return this.router.exclusive(async () => {
      const state = await this.router._refresh();
      const changes = [];
      const add = (side, index, value) => {
        if (state[side][index] !== value) changes.push({side, index, before: state[side][index], value});
      };
      if (request.kind === 'route') {
        if (![request.input, request.output].every(n => Number.isInteger(n) && n >= 1 && n <= 40)) throw new Error('Choose an input and output from 1 to 40.');
        add('routes', request.output - 1, request.input);
      } else {
        if (!['labels', 'routing', 'full'].includes(request.kind)) throw new Error('Unknown send operation.');
        const data = validate(request.data);
        if (request.kind !== 'routing') for (const side of ['inputs', 'outputs']) data[side].forEach((port, index) => {
          if (/[\x00-\x1f\x7f]/.test(port.label)) throw new Error(`${side} ${index + 1}: labels cannot contain line breaks or control characters.`);
          add(side, index, port.label);
        });
        if (request.kind !== 'labels') {
          if (data.routes.some(value => value === null)) throw new Error('A full routing table requires a source for all 40 outputs. Pull from the router or assign the missing sources first.');
          data.routes.forEach((value, index) => add('routes', index, value));
        }
      }
      this.checkLocks(changes, state);
      const id = randomUUID();
      // Only the most recent preview can be applied. Reconnecting invalidates it.
      this.plans.clear();
      this.plans.set(id, {changes, host: this.router.host, socket: this.router.socket, expires: Date.now() + 120000});
      return {id, changes, host: this.router.host, model: state.device['Model name']};
    });
  }
  checkLocks(changes, state) {
    const locked = changes.filter(c => c.side === 'routes' && state.locks[c.index] !== 'U');
    if (locked.length) throw new Error(`Routing blocked: output${locked.length > 1 ? 's' : ''} ${locked.map(c => c.index + 1).join(', ')} locked. This helper never overrides locks.`);
  }
  apply(id) {
    return this.router.exclusive(async () => {
      const plan = this.plans.get(id); this.plans.delete(id);
      if (!plan || plan.expires < Date.now() || plan.socket !== this.router.socket || plan.host !== this.router.host) throw new Error('Preview expired or connection changed. Preview again.');
      const state = await this.router._refresh();
      if (plan.changes.some(c => state[c.side][c.index] !== c.before)) throw new Error('The router changed since the preview. Nothing was sent. Preview again.');
      this.checkLocks(plan.changes, state);
      try {
        for (const side of ['inputs', 'outputs', 'routes']) {
          const changes = plan.changes.filter(c => c.side === side);
          if (!changes.length) continue;
          await this.router.command(`${sections[side]}:\n${changes.map(c => `${c.index} ${side === 'routes' ? c.value - 1 : c.value}`).join('\n')}\n\n`);
        }
        const actual = await this.router._refresh();
        const mismatches = plan.changes.filter(c => actual[c.side][c.index] !== c.value);
        if (mismatches.length) throw new Error(`${mismatches.length} requested changes were not confirmed by readback.`);
        return {verified: plan.changes.length, snapshot: actual};
      } catch (error) {
        throw new Error(`${error.message} Some changes may have applied. Pull from the router and review before retrying.`);
      }
    });
  }
}
