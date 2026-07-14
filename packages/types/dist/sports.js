"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPORT_MAP = exports.SPORTS = void 0;
exports.SPORTS = [
    { id: 'football', label: 'Futebol', emoji: '⚽' },
    { id: 'futsal', label: 'Futsal', emoji: '🥅' },
    { id: 'volleyball', label: 'Vôlei', emoji: '🏐' },
    { id: 'beach', label: 'Beach Tennis', emoji: '🏖️' },
    { id: 'tennis', label: 'Tênis', emoji: '🎾' },
    { id: 'basketball', label: 'Basquete', emoji: '🏀' },
    { id: 'kart', label: 'Kart', emoji: '🏎️' },
    { id: 'cycling', label: 'Ciclismo', emoji: '🚴' },
    { id: 'running', label: 'Corrida', emoji: '🏃' },
    { id: 'bbq', label: 'Churrasco', emoji: '🍖' },
    { id: 'other', label: 'Outros', emoji: '🎯' },
];
exports.SPORT_MAP = Object.fromEntries(exports.SPORTS.map((s) => [s.id, s]));
