type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className="bg-green-500 h-3 transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
