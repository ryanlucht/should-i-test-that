/// <reference types="vite/client" />
/// <reference types="vite-plugin-comlink/client" />

/**
 * Type declarations for jstat library
 *
 * jStat doesn't have @types/jstat package, so we declare the subset we use.
 * We use Student-t distribution functions for Advanced mode prior shapes.
 */
declare module 'jstat' {
  interface JStatStudentt {
    /** Student-t probability density function */
    pdf(x: number, dof: number): number;
    /** Student-t cumulative distribution function */
    cdf(x: number, dof: number): number;
    /** Student-t inverse CDF (quantile function) */
    inv(p: number, dof: number): number;
  }

  interface JStatStatic {
    studentt: JStatStudentt;
  }

  const jStat: JStatStatic;
  export default jStat;
}
