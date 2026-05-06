interface CroppedArtProps {
  src: string;
  alt?: string;
  className?: string;
  decorative?: boolean;
}

export function CroppedArt({
  src,
  alt = '',
  className = '',
  decorative = true,
}: CroppedArtProps) {
  return (
    <img
      className={className}
      src={src}
      alt={decorative ? '' : alt}
      aria-hidden={decorative ? 'true' : undefined}
    />
  );
}
