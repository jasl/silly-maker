// SPDX-License-Identifier: MIT

export interface RuntimeUnitTimingInternalV1 {
  readonly loadMs: number;
  readonly admitMs: number;
  readonly activateMs: number;
  readonly totalMs: number;
}

export interface RuntimeUnitResidentInternalV1<TUnitId extends string, TPlan> {
  readonly unitId: TUnitId;
  readonly generation: string;
  readonly plan: TPlan;
  readonly timing: RuntimeUnitTimingInternalV1;
}

export interface RuntimeUnitLeaseInternalV1<TUnitId extends string, TPlan>
  extends RuntimeUnitResidentInternalV1<TUnitId, TPlan> {
  /** Releases only this acquisition. Repeated calls are no-ops. */
  release(): void;
}

export interface RuntimeUnitAcquirePhasesInternalV1<TLoaded, TAdmitted, TPlan> {
  load(): Promise<TLoaded>;
  admit(loaded: TLoaded): TAdmitted | Promise<TAdmitted>;
  activate(admitted: TAdmitted): TPlan | Promise<TPlan>;
}

export interface RuntimeUnitResidencyInternalV1<TUnitId extends string, TPlan> {
  readonly generation: string;
  acquire<TLoaded, TAdmitted>(
    unitId: TUnitId,
    phases: RuntimeUnitAcquirePhasesInternalV1<TLoaded, TAdmitted, TPlan>,
  ): Promise<RuntimeUnitLeaseInternalV1<TUnitId, TPlan>>;
  /**
   * Non-owning cold-path lookup for the instance binding/readiness owner.
   * Hot consumers retain the direct plan from a lease instead of consulting
   * this map while executing or rendering.
   */
  getResident(unitId: TUnitId): RuntimeUnitResidentInternalV1<TUnitId, TPlan> | null;
  dispose(): void;
}

export class RuntimeUnitResidencyStaleErrorInternalV1 extends Error {
  readonly unitId: string;
  readonly generation: string;

  constructor(unitId: string, generation: string) {
    super(`runtime_unit_residency_stale:${generation}:${unitId}`);
    this.name = "RuntimeUnitResidencyStaleErrorInternalV1";
    this.unitId = unitId;
    this.generation = generation;
  }
}

interface ResidentRecordInternalV1<TUnitId extends string, TPlan>
  extends RuntimeUnitResidentInternalV1<TUnitId, TPlan> {
  leaseCount: number;
  retired: boolean;
}

/**
 * Package-private lifecycle primitive shared by type-specific unit owners.
 * Callers own stable-ID admission, manifest lookup, bytes/schema validation,
 * and compilation. This helper owns only residency and generation lifetime.
 */
export function createRuntimeUnitResidencyInternalV1<TUnitId extends string, TPlan>(input: {
  readonly generation: string;
  readonly now?: () => number;
  readonly disposePlan?: (unitId: TUnitId, plan: TPlan) => void;
}): RuntimeUnitResidencyInternalV1<TUnitId, TPlan> {
  const generation = input.generation;
  const now = input.now ?? (() => performance.now());
  const residents = new Map<TUnitId, ResidentRecordInternalV1<TUnitId, TPlan>>();
  const flights = new Map<TUnitId, Promise<ResidentRecordInternalV1<TUnitId, TPlan>>>();
  let disposed = false;

  const stale = (unitId: TUnitId): RuntimeUnitResidencyStaleErrorInternalV1 =>
    new RuntimeUnitResidencyStaleErrorInternalV1(unitId, generation);

  const retire = (record: ResidentRecordInternalV1<TUnitId, TPlan>): void => {
    if (record.retired) return;
    record.retired = true;
    if (residents.get(record.unitId) === record) residents.delete(record.unitId);
    input.disposePlan?.(record.unitId, record.plan);
  };

  const lease = (
    record: ResidentRecordInternalV1<TUnitId, TPlan>,
  ): RuntimeUnitLeaseInternalV1<TUnitId, TPlan> => {
    record.leaseCount += 1;
    let released = false;
    return {
      unitId: record.unitId,
      generation,
      plan: record.plan,
      timing: record.timing,
      release(): void {
        if (released) return;
        released = true;
        if (record.retired) return;
        record.leaseCount -= 1;
        if (record.leaseCount === 0) retire(record);
      },
    };
  };

  const startFlight = <TLoaded, TAdmitted>(
    unitId: TUnitId,
    phases: RuntimeUnitAcquirePhasesInternalV1<TLoaded, TAdmitted, TPlan>,
  ): Promise<ResidentRecordInternalV1<TUnitId, TPlan>> => {
    const run = async (): Promise<ResidentRecordInternalV1<TUnitId, TPlan>> => {
      const startedAt = now();
      const loaded = await phases.load();
      const loadedAt = now();
      if (disposed) throw stale(unitId);

      const admitted = await phases.admit(loaded);
      const admittedAt = now();
      if (disposed) throw stale(unitId);

      const plan = await phases.activate(admitted);
      const activatedAt = now();
      if (disposed) {
        input.disposePlan?.(unitId, plan);
        throw stale(unitId);
      }

      const record: ResidentRecordInternalV1<TUnitId, TPlan> = {
        unitId,
        generation,
        plan,
        timing: {
          loadMs: loadedAt - startedAt,
          admitMs: admittedAt - loadedAt,
          activateMs: activatedAt - admittedAt,
          totalMs: activatedAt - startedAt,
        },
        leaseCount: 0,
        retired: false,
      };
      residents.set(unitId, record);
      return record;
    };

    // Install the flight before invoking product code, so even a synchronous
    // re-entrant acquire observes the same exact attempt.
    const flight = Promise.resolve().then(run);
    flights.set(unitId, flight);
    void flight.then(
      () => {
        if (flights.get(unitId) === flight) flights.delete(unitId);
      },
      () => {
        if (flights.get(unitId) === flight) flights.delete(unitId);
      },
    );
    return flight;
  };

  const acquire = async <TLoaded, TAdmitted>(
    unitId: TUnitId,
    phases: RuntimeUnitAcquirePhasesInternalV1<TLoaded, TAdmitted, TPlan>,
  ): Promise<RuntimeUnitLeaseInternalV1<TUnitId, TPlan>> => {
    if (disposed) throw stale(unitId);
    const current = residents.get(unitId);
    if (current !== undefined) return lease(current);

    const flight = flights.get(unitId) ?? startFlight(unitId, phases);
    const record = await flight;
    if (disposed || residents.get(unitId) !== record || record.retired) throw stale(unitId);
    return lease(record);
  };

  return {
    generation,
    acquire,
    getResident(unitId): RuntimeUnitResidentInternalV1<TUnitId, TPlan> | null {
      const record = residents.get(unitId);
      if (record === undefined || record.retired) return null;
      return {
        unitId: record.unitId,
        generation,
        plan: record.plan,
        timing: record.timing,
      };
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      const current = [...residents.values()];
      residents.clear();
      let firstFailure: unknown;
      for (const record of current) {
        try {
          retire(record);
        } catch (error) {
          firstFailure ??= error;
        }
      }
      if (firstFailure !== undefined) throw firstFailure;
    },
  };
}
