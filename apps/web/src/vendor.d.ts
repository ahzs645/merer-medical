/* eslint-disable @typescript-eslint/no-explicit-any */

declare module '@hookform/resolvers/yup' {
  export const yupResolver: any;
}

declare module '@billboard.js/react' {
  const BillboardJS: any;
  export type IChart = any;
  export default BillboardJS;
}
