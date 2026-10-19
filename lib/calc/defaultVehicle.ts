// Which vehicle the calculator opens with (plan 2.3).
interface V { id: string; name: string; model: string }
interface T { timestamp: number; vehicleName: string; vehicleModel: string }

export function defaultVehicle<A extends V>(vehicles: A[], trips: T[], lastVehicleId?: string | null): A | null {
  if (!vehicles.length) return null;
  const last = vehicles.find((v) => v.id === lastVehicleId);
  if (last) return last;
  const t = trips.reduce<T | null>((m, x) => (!m || x.timestamp > m.timestamp ? x : m), null);
  return (t && vehicles.find((v) => v.name === t.vehicleName && v.model === t.vehicleModel)) || vehicles[0];
}
