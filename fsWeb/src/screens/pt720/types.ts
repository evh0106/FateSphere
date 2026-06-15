export interface MenuProps {
  runTask: (task: () => Promise<void>) => Promise<void>;
  setLastResponse: (data: unknown) => void;
  setMessage: (msg: string) => void;
}
