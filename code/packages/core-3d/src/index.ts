export { parseExpression, validateExpression, parseWithScope, detectParameters } from './parser';
export { findRoots, findExtrema, findIntersections } from './evaluator';
export type { SpecialPointData, Point } from './evaluator';
export { parseJsonData, parseCsvData, normalizeImplicit } from './dataset';
export type { DataPoint } from './dataset';
export { evaluate3D, validate3DExpression } from './evaluator3d';
export { parseJsonData3D, parseCsvData3D, boundsOf } from './dataset3d';
export type { DataPoint3D } from './dataset3d';
