export const getDailySeed = () => {
  const d = new Date();
  // Generates a unique integer for each day, e.g., 20231025
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

export const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const dailyShuffle = <T>(array: T[]): T[] => {
  let seed = getDailySeed();
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed++) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const getDailySelection = <T>(array: T[], count: number): T[] => {
  if (!array || array.length === 0) return [];
  const shuffled = dailyShuffle(array);
  return shuffled.slice(0, count);
};
