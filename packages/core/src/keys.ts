/** Every item of a Business lives under this partition key. */
export const businessPk = (businessId: string) => `BUSINESS#${businessId}`;
