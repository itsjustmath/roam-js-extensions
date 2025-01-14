import React from "react";
import dynamic from "next/dynamic";

const DemoMaps: React.FunctionComponent = () => {
  process.env.MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const Map = dynamic(() => import("../src/components/Maps"), { ssr: false });
  return (
    <Map
      blockId="demo"
      center={[32.715736, -117.161087]}
      zoom={12}
      markers={[
        { tag: "David Vargas", x: 32.7, y: -117.2 },
        { tag: "RoamJS", x: 32.72, y: -117.1 },
      ]}
    />
  );
};

export default DemoMaps;
