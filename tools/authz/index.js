// tools/authz/index.js
// Programmatic entry point for Rentify Authorization Policy Matrix.

const fs = require('fs');
const path = require('path');
const {
  validateMatrix,
  evaluateMatrixAccess,
  REQUIRED_ACTORS,
  REQUIRED_RESOURCES,
} = require('./matrixValidator');

const matrixPath = path.resolve(__dirname, '../../docs/security/authorization-matrix.json');

function loadMatrix() {
  if (!fs.existsSync(matrixPath)) {
    throw new Error(`Authorization matrix not found at: ${matrixPath}`);
  }
  return JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
}

function getOperation(operationId) {
  const matrix = loadMatrix();
  return matrix.operations.find((op) => op.operationId === operationId) || null;
}

function getOperationsByResource(resource) {
  const matrix = loadMatrix();
  return matrix.operations.filter((op) => op.resource === resource);
}

function getOperationsByService(service) {
  const matrix = loadMatrix();
  return matrix.operations.filter((op) => op.service === service);
}

function getOperationsByActorDecision(actorName, decision = 'allow') {
  const matrix = loadMatrix();
  return matrix.operations.filter((op) => op.actorMatrix && op.actorMatrix[actorName] === decision);
}

function getRecordedGaps() {
  const matrix = loadMatrix();
  return matrix.operations.filter((op) => op.currentImplementationStatus === 'gap');
}

module.exports = {
  loadMatrix,
  getOperation,
  getOperationsByResource,
  getOperationsByService,
  getOperationsByActorDecision,
  getRecordedGaps,
  validateMatrix,
  evaluateMatrixAccess,
  REQUIRED_ACTORS,
  REQUIRED_RESOURCES,
};
