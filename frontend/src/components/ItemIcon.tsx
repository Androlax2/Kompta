import { useState } from "react";
import { Package } from "lucide-react";

interface ItemIconProps {
  imgUrl: string;
  size?: number;
}

// Dofus item artwork (from DofusDB) with a neutral fallback when the
// item has no icon or the image fails to load (e.g. offline).
function ItemIcon({ imgUrl, size = 24 }: ItemIconProps) {
  const [failed, setFailed] = useState(false);

  if (imgUrl === "" || failed) {
    return (
      <div
        className="rounded bg-muted flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <Package
          className="text-muted-foreground"
          style={{ width: size * 0.55, height: size * 0.55 }}
        />
      </div>
    );
  }
  return (
    <img
      src={imgUrl}
      alt=""
      width={size}
      height={size}
      className="rounded shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export default ItemIcon;
