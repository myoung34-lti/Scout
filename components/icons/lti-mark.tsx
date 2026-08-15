export function LtiMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20 15H55V100H110V135H20V15Z M120 15H220V50H187.5V135H152.5V50H120V15Z M240 15H275V135H240V15Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  )
}
