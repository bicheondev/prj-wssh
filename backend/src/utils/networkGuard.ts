import dns from 'dns/promises';
import net from 'net';

const v4blocked = [/^127\./,/^10\./,/^192\.168\./,/^172\.(1[6-9]|2\d|3[0-1])\./,/^169\.254\./,/^0\./,/^224\./,/^240\./,/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,/^169\.254\.169\.254$/];
const hostBlocked = [/^localhost$/i,/^.*\.localhost$/i];
export async function validateTarget(hostname: string, port: number, allowPrivate: boolean) {
  if (!Number.isInteger(port) || port<1 || port>65535) throw new Error('Invalid port');
  if (hostBlocked.some(r=>r.test(hostname))) throw new Error('Blocked host');
  const addrs = await dns.lookup(hostname,{all:true});
  if (!addrs.length) throw new Error('No DNS results');
  for (const a of addrs) {
    if (net.isIPv4(a.address) && !allowPrivate && v4blocked.some(r=>r.test(a.address))) throw new Error('Blocked by network policy');
    if (a.address==='::1' || a.address.startsWith('fc') || a.address.startsWith('fd')) throw new Error('Blocked by network policy');
  }
  return addrs.map(a=>a.address);
}
