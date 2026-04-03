interface ArdhiShieldProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export default function ArdhiShield({ size = "sm", className = "" }: ArdhiShieldProps) {
  return (
    <svg
      viewBox="0 0 24 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizes[size]} ${className}`}
    >
      {/* Shield shape */}
      <path
        d="M12 1L2 5.5V12.5C2 19.5 6.5 25.5 12 27C17.5 25.5 22 19.5 22 12.5V5.5L12 1Z"
        fill="#00A550"
      />
      {/* Inner lighter shield */}
      <path
        d="M12 3L4 6.75V12.5C4 18.5 7.75 23.75 12 25C16.25 23.75 20 18.5 20 12.5V6.75L12 3Z"
        fill="#00A550"
        stroke="white"
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />
      {/* Checkmark */}
      <path
        d="M8.5 13.5L11 16L16 11"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Small 'A' at top */}
      <text
        x="12"
        y="9"
        textAnchor="middle"
        fill="white"
        fontSize="5"
        fontWeight="800"
        fontFamily="serif"
        opacity="0.6"
      >
        A
      </text>
    </svg>
  );
}
