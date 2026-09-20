import React from 'react';

interface YouTubePlayerProps {
  containerId: string;
  videoId: string;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ containerId }) => {
  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <div id={containerId} className="w-full h-full" />
    </div>
  );
};
