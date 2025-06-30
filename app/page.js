"use client";
import React, { useState } from "react";
import { wordPairs } from "./data/wordPairs";

/**
 * A completely client‑side "Who is the Undercover" helper.
 * Each device computes the same room state deterministically from:
 *   – roomCode (shared passphrase)
 *   – playerCount (shared total number of players)
 *   – seatNumber  (unique per player)
 * No network requests or back‑end required.
 */
export default function UndercoverApp() {
  // Shared inputs
  const [roomCode, setRoomCode] = useState("");
  const [playerCount, setPlayerCount] = useState("");
  const [seatNumber, setSeatNumber] = useState("");

  // Computed game data
  const [role, setRole] = useState(null); // "卧底" | "平民"
  const [word, setWord] = useState(null);
  const [showWord, setShowWord] = useState(false);
  const [eliminated, setEliminated] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);

  // Deterministic PRNG utils (xmur3 + sfc32)
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function sfc32(a, b, c, d) {
    return () => {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }

  // Compute game data deterministically
  function computeGame(roomCode, playerCount) {
    const seedFn = xmur3(roomCode + "|" + playerCount);
    const rng = sfc32(seedFn(), seedFn(), seedFn(), seedFn());

    const pair = wordPairs[Math.floor(rng() * wordPairs.length)];
    const seats = Array.from({ length: playerCount }, (_, i) => i + 1);
    // Fisher–Yates shuffle
    for (let i = seats.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [seats[i], seats[j]] = [seats[j], seats[i]];
    }
    const undercoverCount = playerCount <= 6 ? 1 : playerCount <= 11 ? 2 : 3;
    const undercoverSeats = new Set(seats.slice(0, undercoverCount));
    return { pair, undercoverSeats };
  }

  // Handle generate button click
  function handleGenerate(e) {
    e.preventDefault();
    const n = parseInt(playerCount, 10);
    const s = parseInt(seatNumber, 10);
    if (!roomCode || !n || !s || s < 1 || s > n) {
      alert("请填写正确的房间号、人数和座位号");
      return;
    }
    const { pair, undercoverSeats } = computeGame(roomCode, n);
    const isUndercover = undercoverSeats.has(s);
    setRole(isUndercover ? "卧底" : "平民");
    setWord(isUndercover ? pair[0] : pair[1]);
    setShowWord(false);
    setEliminated(false);
    setShowIdentity(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 space-y-6 bg-gray-50">
      <h1 className="text-3xl font-bold">谁是卧底 · 线下助手</h1>

      {/* Input Section */}
      <form onSubmit={handleGenerate} className="w-full max-w-md space-y-4">
        <div>
          <label className="block mb-1">房间号（每局游戏唯一）</label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.trim())}
            className="w-full border rounded p-2"
            placeholder="例如: abc123"
            required
          />
        </div>
        <div>
          <label className="block mb-1">总人数</label>
          <input
            type="number"
            value={playerCount}
            onChange={(e) => setPlayerCount(e.target.value)}
            min={3}
            className="w-full border rounded p-2"
            placeholder="例如: 8"
            required
          />
        </div>
        <div>
          <label className="block mb-1">你的座位号（每位玩家唯一）</label>
          <input
            type="number"
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
            min={1}
            className="w-full border rounded p-2"
            placeholder="例如: 3"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 rounded bg-blue-600 text-white font-medium"
        >生成我的暗号</button>
      </form>

      {/* Word Display */}
      {word && (
        <div className="w-full max-w-md bg-white shadow rounded p-6 text-center">
          {!showWord ? (
            <button
              onClick={() => setShowWord(true)}
              className="w-full py-2 rounded bg-green-500 text-white"
            >点击查看你的暗号</button>
          ) : (
            <p className="text-2xl font-semibold">{word}</p>
          )}
        </div>
      )}

      {/* Elimination & Identity */}
      {role && (
        <div className="w-full max-w-md bg-white shadow rounded p-6 text-center">
          {!eliminated ? (
            <button
              onClick={() => setEliminated(true)}
              className="w-full py-2 rounded border border-gray-400"
            >我被票出／淘汰</button>
          ) : !showIdentity ? (
            <button
              onClick={() => setShowIdentity(true)}
              className="w-full py-2 rounded bg-purple-600 text-white"
            >查看我的身份</button>
          ) : (
            <p className="text-xl font-bold">你的身份：{role}</p>
          )}
        </div>
      )}

      <footer className="text-xs text-gray-500 mt-auto">
        纯前端实现 · 所有计算在本地浏览器，无需联网
      </footer>
    </div>
  );
}
