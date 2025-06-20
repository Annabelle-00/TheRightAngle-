import React from 'react';
import { motion } from 'framer-motion';

const ProgressCircle = ({ percentage, size = 100, strokeWidth = 10, targetReached = false }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  const baseColor = "text-slate-200 dark:text-slate-700";
  
  const progressStrokeColor = targetReached 
    ? "rgb(34 197 94)" 
    : "rgb(59 130 246)";
  
  const progressFillColor = targetReached
    ? "rgba(34, 197, 94, 0.2)" 
    : "rgba(59, 130, 246, 0.1)";

  const textColor = targetReached 
    ? 'fill-green-600 dark:fill-green-300' 
    : 'fill-blue-600 dark:fill-blue-300';

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="transform -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className={baseColor}
        fill="transparent"
      />
      {percentage > 0 && (
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth / 2} 
          className="transition-colors duration-500"
          style={{ fill: progressFillColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: targetReached ? 1 : 0.3 }}
          transition={{ duration: 0.5 }}
        />
      )}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={`transition-colors duration-500`}
        style={{ stroke: progressStrokeColor }}
        fill="transparent"
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        className={`transform rotate-90 origin-center text-lg font-semibold transition-colors duration-500 ${textColor}`}
      >
        {`${Math.round(percentage)}%`}
      </text>
    </motion.svg>
  );
};

export default ProgressCircle;