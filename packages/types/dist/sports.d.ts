export declare const SPORTS: readonly [{
    readonly id: "football";
    readonly label: "Futebol";
    readonly emoji: "⚽";
}, {
    readonly id: "futsal";
    readonly label: "Futsal";
    readonly emoji: "🥅";
}, {
    readonly id: "volleyball";
    readonly label: "Vôlei";
    readonly emoji: "🏐";
}, {
    readonly id: "beach";
    readonly label: "Beach Tennis";
    readonly emoji: "🏖️";
}, {
    readonly id: "tennis";
    readonly label: "Tênis";
    readonly emoji: "🎾";
}, {
    readonly id: "basketball";
    readonly label: "Basquete";
    readonly emoji: "🏀";
}, {
    readonly id: "kart";
    readonly label: "Kart";
    readonly emoji: "🏎️";
}, {
    readonly id: "cycling";
    readonly label: "Ciclismo";
    readonly emoji: "🚴";
}, {
    readonly id: "running";
    readonly label: "Corrida";
    readonly emoji: "🏃";
}, {
    readonly id: "bbq";
    readonly label: "Churrasco";
    readonly emoji: "🍖";
}, {
    readonly id: "other";
    readonly label: "Outros";
    readonly emoji: "🎯";
}];
export type SportId = (typeof SPORTS)[number]['id'];
export declare const SPORT_MAP: Record<SportId, (typeof SPORTS)[number]>;
