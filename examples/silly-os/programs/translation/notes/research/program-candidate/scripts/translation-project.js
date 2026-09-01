"use strict";

(() => {
  const command = argv[0];

  const fail = (message) => {
    throw new TypeError(message);
  };
  const readJson = (path) => {
    try {
      return JSON.parse(workspace.readFile(path));
    } catch {
      return fail(`invalid JSON: ${path}`);
    }
  };
  const writeJson = (path, value) => {
    workspace.writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
  };
  const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const nonEmptyText = (value) => typeof value === "string" && value.length > 0;
  const exactKeys = (value, keys) =>
    isRecord(value) && Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
  const tokenPattern = /⟦SM:\d+⟧/g;
  const tokens = (text) => text.match(tokenPattern) || [];
  const sameTokens = (source, target) => {
    const left = tokens(source);
    const right = tokens(target);
    return left.length === right.length && left.every((token, index) => token === right[index]);
  };
  const admitGlossary = (value) => {
    if (!Array.isArray(value)) fail("invalid glossary");
    return value.map((entry) => {
      if (
        !exactKeys(entry, ["source", "target", "note", "locked"]) ||
        !nonEmptyText(entry.source) || !nonEmptyText(entry.target) ||
        (entry.note !== null && typeof entry.note !== "string") ||
        typeof entry.locked !== "boolean"
      ) fail("invalid glossary entry");
      return entry;
    });
  };
  const admitUnits = (value, orderPolicy) => {
    if (!Array.isArray(value) || value.length === 0) fail("invalid units");
    const seen = new Set();
    return value.map((unit, index) => {
      if (
        !exactKeys(unit, [
          "unitId",
          "order",
          "locator",
          "context",
          "durationMilliseconds",
          "source",
          "target",
        ]) || !nonEmptyText(unit.unitId) || seen.has(unit.unitId) ||
        !Number.isSafeInteger(unit.order) || unit.order < 0 ||
        (orderPolicy === "complete_project" && unit.order !== index) ||
        (orderPolicy === "project_subset" && index > 0 && unit.order <= value[index - 1].order) ||
        !nonEmptyText(unit.locator) ||
        (unit.context !== null && typeof unit.context !== "string") ||
        (unit.durationMilliseconds !== null &&
          (!Number.isSafeInteger(unit.durationMilliseconds) || unit.durationMilliseconds <= 0)) ||
        !nonEmptyText(unit.source) ||
        (unit.target !== null && !nonEmptyText(unit.target))
      ) fail("invalid unit");
      seen.add(unit.unitId);
      return unit;
    });
  };
  const admitProject = (value) => {
    if (
      !exactKeys(value, [
        "schema",
        "projectId",
        "revision",
        "sourceLocale",
        "targetLocale",
        "documentPurpose",
        "style",
        "glossary",
        "units",
        "committedBatches",
      ]) || value.schema !== "sillyos.translation-project.research.v1" ||
      !nonEmptyText(value.projectId) || !Number.isSafeInteger(value.revision) ||
      value.revision < 1 ||
      !nonEmptyText(value.sourceLocale) || !nonEmptyText(value.targetLocale) ||
      !nonEmptyText(value.documentPurpose) || !nonEmptyText(value.style) ||
      !Array.isArray(value.committedBatches) ||
      !value.committedBatches.every(nonEmptyText)
    ) fail("invalid project");
    return {
      ...value,
      glossary: admitGlossary(value.glossary),
      units: admitUnits(value.units, "complete_project"),
    };
  };
  const admitBatch = (value) => {
    if (
      !exactKeys(value, [
        "schema",
        "batchId",
        "projectId",
        "projectRevision",
        "sourceLocale",
        "targetLocale",
        "documentPurpose",
        "style",
        "glossary",
        "units",
      ]) || value.schema !== "sillyos.translation-batch.research.v1" ||
      !nonEmptyText(value.batchId) || !nonEmptyText(value.projectId) ||
      !Number.isSafeInteger(value.projectRevision) || value.projectRevision < 1 ||
      !nonEmptyText(value.sourceLocale) || !nonEmptyText(value.targetLocale) ||
      !nonEmptyText(value.documentPurpose) || !nonEmptyText(value.style)
    ) fail("invalid batch");
    return {
      ...value,
      glossary: admitGlossary(value.glossary),
      units: admitUnits(value.units, "project_subset"),
    };
  };
  const sameGlossaryEntry = (left, right) =>
    left.source === right.source && left.target === right.target && left.note === right.note &&
    left.locked === right.locked;
  const sameUnit = (left, right) =>
    left.unitId === right.unitId && left.order === right.order && left.locator === right.locator &&
    left.context === right.context && left.durationMilliseconds === right.durationMilliseconds &&
    left.source === right.source && left.target === right.target;
  const expectedBatchForProject = (project, unitCount) => {
    const units = project.units.filter((unit) => unit.target === null).slice(0, unitCount);
    if (units.length !== unitCount || units.length === 0) fail("batch does not match pending work");
    const sourceText = units.map((unit) => unit.source).join("\n");
    const glossary = project.glossary.filter((entry) => sourceText.includes(entry.source));
    return {
      schema: "sillyos.translation-batch.research.v1",
      batchId: `${project.projectId}.r${project.revision}.${units[0].unitId}.${units.length}`,
      projectId: project.projectId,
      projectRevision: project.revision,
      sourceLocale: project.sourceLocale,
      targetLocale: project.targetLocale,
      documentPurpose: project.documentPurpose,
      style: project.style,
      glossary,
      units,
    };
  };
  const batchMatchesProject = (batch, project) => {
    const expected = expectedBatchForProject(project, batch.units.length);
    return batch.schema === expected.schema && batch.batchId === expected.batchId &&
      batch.projectId === expected.projectId &&
      batch.projectRevision === expected.projectRevision &&
      batch.sourceLocale === expected.sourceLocale &&
      batch.targetLocale === expected.targetLocale &&
      batch.documentPurpose === expected.documentPurpose && batch.style === expected.style &&
      batch.glossary.length === expected.glossary.length &&
      batch.glossary.every((entry, index) => sameGlossaryEntry(entry, expected.glossary[index])) &&
      batch.units.length === expected.units.length &&
      batch.units.every((unit, index) => sameUnit(unit, expected.units[index]));
  };
  const admitCandidate = (value, batch) => {
    if (
      !exactKeys(value, ["targets", "ambiguities"]) || !Array.isArray(value.targets) ||
      !Array.isArray(value.ambiguities)
    ) fail("invalid candidate");
    const targets = value.targets.map((target) => {
      if (
        !exactKeys(target, ["unitId", "target"]) || !nonEmptyText(target.unitId) ||
        !nonEmptyText(target.target)
      ) fail("invalid target");
      return target;
    });
    if (targets.length !== batch.units.length) fail("candidate coverage mismatch");
    targets.forEach((target, index) => {
      const unit = batch.units[index];
      if (target.unitId !== unit.unitId) fail("candidate order mismatch");
      if (!sameTokens(unit.source, target.target)) fail("protected token mismatch");
    });
    const ambiguityIds = new Set();
    const unitIds = new Set(batch.units.map((unit) => unit.unitId));
    const ambiguities = value.ambiguities.map((ambiguity) => {
      if (
        !exactKeys(ambiguity, ["unitId", "question"]) ||
        !unitIds.has(ambiguity.unitId) || ambiguityIds.has(ambiguity.unitId) ||
        !nonEmptyText(ambiguity.question)
      ) fail("invalid ambiguity");
      ambiguityIds.add(ambiguity.unitId);
      return ambiguity;
    });
    return { targets, ambiguities };
  };
  const validationReport = (batch, candidate) => {
    const findings = [];
    for (let index = 0; index < batch.units.length; index += 1) {
      const unit = batch.units[index];
      const target = candidate.targets[index].target;
      for (const entry of batch.glossary) {
        if (entry.locked && unit.source.includes(entry.source) && !target.includes(entry.target)) {
          findings.push({
            code: "locked_glossary_missing",
            unitId: unit.unitId,
            source: entry.source,
            expectedTarget: entry.target,
          });
        }
      }
    }
    return {
      schema: "sillyos.translation-validation.research.v1",
      batchId: batch.batchId,
      accepted: findings.length === 0,
      findings,
      ambiguities: candidate.ambiguities,
    };
  };

  if (command === "prepare") {
    if (argv.length !== 4) fail("usage: prepare PROJECT OUTPUT MAX_UNITS");
    const project = admitProject(readJson(argv[1]));
    const maximumUnits = Number(argv[3]);
    if (!Number.isSafeInteger(maximumUnits) || maximumUnits <= 0) fail("invalid batch size");
    const pendingCount = project.units.filter((unit) => unit.target === null).length;
    if (pendingCount === 0) fail("no pending units");
    const batch = expectedBatchForProject(project, Math.min(maximumUnits, pendingCount));
    writeJson(argv[2], batch);
    print(JSON.stringify({
      batchId: batch.batchId,
      units: batch.units.length,
      glossary: batch.glossary.length,
    }));
    return;
  }

  if (command === "validate") {
    if (argv.length !== 4) fail("usage: validate BATCH CANDIDATE OUTPUT");
    const batch = admitBatch(readJson(argv[1]));
    const candidate = admitCandidate(readJson(argv[2]), batch);
    const report = validationReport(batch, candidate);
    writeJson(argv[3], report);
    print(JSON.stringify({ batchId: batch.batchId, accepted: report.accepted }));
    return;
  }

  if (command === "commit") {
    if (argv.length !== 5) fail("usage: commit PROJECT BATCH CANDIDATE OUTPUT");
    const project = admitProject(readJson(argv[1]));
    const batch = admitBatch(readJson(argv[2]));
    const candidate = admitCandidate(readJson(argv[3]), batch);
    const report = validationReport(batch, candidate);
    if (!report.accepted) fail("candidate failed validation");
    if (!batchMatchesProject(batch, project)) fail("batch does not match project");
    if (project.committedBatches.includes(batch.batchId)) fail("stale batch");
    const targets = new Map(candidate.targets.map((target) => [target.unitId, target.target]));
    const batchIds = new Set(batch.units.map((unit) => unit.unitId));
    const nextUnits = project.units.map((unit) => {
      if (!batchIds.has(unit.unitId)) return unit;
      if (unit.target !== null) fail("target is already committed");
      const target = targets.get(unit.unitId);
      if (!nonEmptyText(target)) fail("target is missing");
      return { ...unit, target };
    });
    writeJson(argv[4], {
      ...project,
      revision: project.revision + 1,
      units: nextUnits,
      committedBatches: [...project.committedBatches, batch.batchId],
    });
    print(JSON.stringify({ batchId: batch.batchId, revision: project.revision + 1 }));
    return;
  }

  if (command === "verify") {
    if (argv.length !== 3) fail("usage: verify PROJECT OUTPUT");
    const project = admitProject(readJson(argv[1]));
    const findings = [];
    for (const unit of project.units) {
      if (unit.target === null) {
        findings.push({ code: "target_missing", unitId: unit.unitId });
        continue;
      }
      if (!sameTokens(unit.source, unit.target)) {
        findings.push({ code: "protected_token_mismatch", unitId: unit.unitId });
      }
      for (const entry of project.glossary) {
        if (
          entry.locked && unit.source.includes(entry.source) && !unit.target.includes(entry.target)
        ) {
          findings.push({
            code: "locked_glossary_missing",
            unitId: unit.unitId,
            source: entry.source,
            expectedTarget: entry.target,
          });
        }
      }
    }
    const report = {
      schema: "sillyos.translation-project-verification.research.v1",
      projectId: project.projectId,
      projectRevision: project.revision,
      complete: findings.length === 0,
      findings,
    };
    writeJson(argv[2], report);
    print(JSON.stringify({ projectId: project.projectId, complete: report.complete }));
    return;
  }

  fail("unknown command");
})();
