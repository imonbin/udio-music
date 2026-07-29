export type StepLogger = (step: string) => void;

export const noopLogger: StepLogger = () => {};
