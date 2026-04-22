type ScoreTone = {
  label: string;
  badge: string;
  bar: string;
  track: string;
};

export const getScoreTone = (score: number): ScoreTone => {
  if (score >= 90) {
    return {
      label: "Excellent",
      badge: "bg-emerald-100 text-emerald-700",
      bar: "bg-emerald-500",
      track: "bg-emerald-100",
    };
  }

  if (score >= 75) {
    return {
      label: "Strong",
      badge: "bg-sky-100 text-sky-700",
      bar: "bg-sky-500",
      track: "bg-sky-100",
    };
  }

  return {
    label: "Needs work",
    badge: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
    track: "bg-amber-100",
  };
};
