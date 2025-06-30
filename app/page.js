"use client";
import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { wordPairs, wordPairsClassic, wordPairsAdvanced, wordPairsProfessional, wordPairsEntertainment, wordPairsAbstract, wordPairsFunny, wordPairsHarryPotter } from "./data/wordPairs";

/**
 * A completely client‑side "Who is the Undercover" helper.
 * Each device computes the same room state deterministically from:
 *   – roomCode (shared passphrase)
 *   – playerCount (shared total number of players)
 *   – seatNumber  (unique per player)
 *   - wordCategory (shared word category)
 * No network requests or back‑end required.
 */
export default function UndercoverApp() {
  // Shared inputs
  const [roomCode, setRoomCode] = useState("");
  const [playerCount, setPlayerCount] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [wordCategory, setWordCategory] = useState("all"); // Default to all words
  const [showQR, setShowQR] = useState(false);

  // Read URL parameters on page load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('room');
      const count = params.get('players');
      const category = params.get('category');
      
      if (code) setRoomCode(code);
      if (count) setPlayerCount(count);
      if (category) setWordCategory(category);
    }
  }, []);

  // Reset seat number when player count changes
  useEffect(() => {
    const currentPlayerCount = parseInt(playerCount, 10);
    const currentSeatNumber = parseInt(seatNumber, 10);
    
    // Reset seat number if it's invalid for the new player count
    if (currentSeatNumber > currentPlayerCount || (playerCount && !seatNumber)) {
      setSeatNumber("");
    }
  }, [playerCount]);

  // Generate shareable URL
  const getShareableURL = () => {
    if (!roomCode || !playerCount) return null;
    const baseURL = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseURL}?room=${encodeURIComponent(roomCode)}&players=${encodeURIComponent(playerCount)}&category=${encodeURIComponent(wordCategory)}`;
  };

  // Handle share button click
  const handleShare = () => {
    const url = getShareableURL();
    if (!url) {
      alert("请先填写房间号和总人数");
      return;
    }
    navigator.clipboard.writeText(url).then(() => {
      alert("链接已复制到剪贴板");
    });
    setShowQR(true);
  };

  // Word categories
  const categories = [
    { id: "all", name: "全部词库 (All Words)" },
    { id: "classic", name: "经典入门 (Classic & Easy)" },
    { id: "advanced", name: "生活进阶 (Life & Advanced)" },
    { id: "professional", name: "职场/专业 (Professional)" },
    { id: "entertainment", name: "文化娱乐 (Culture & Entertainment)" },
    { id: "abstract", name: "烧脑/抽象 (Brain-burning & Abstract)" },
    { id: "funny", name: "趣味对比 (Funny Comparisons)" },
    { id: "harryPotter", name: "哈利·波特主题 (Harry Potter Theme)" }
  ];

  // Get word pairs based on category
  function getWordPairsByCategory(category) {
    switch (category) {
      case "classic":
        return wordPairsClassic;
      case "advanced":
        return wordPairsAdvanced;
      case "professional":
        return wordPairsProfessional;
      case "entertainment":
        return wordPairsEntertainment;
      case "abstract":
        return wordPairsAbstract;
      case "funny":
        return wordPairsFunny;
      case "harryPotter":
        return wordPairsHarryPotter;
      default:
        return wordPairs;
    }
  }

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
    const seedFn = xmur3(roomCode + "|" + playerCount + "|" + wordCategory);
    const rng = sfc32(seedFn(), seedFn(), seedFn(), seedFn());

    const selectedWordPairs = getWordPairsByCategory(wordCategory);
    const pair = selectedWordPairs[Math.floor(rng() * selectedWordPairs.length)];
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
          <label className="block mb-1">词库选择</label>
          <select
            value={wordCategory}
            onChange={(e) => setWordCategory(e.target.value)}
            className="w-full border rounded p-2"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
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
          <select
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
            className="w-full border rounded p-2"
            required
            disabled={!playerCount || parseInt(playerCount, 10) < 1}
          >
            <option value="">请选择座位号</option>
            {playerCount && parseInt(playerCount, 10) >= 1 && 
              Array.from({ length: parseInt(playerCount, 10) }, (_, i) => i + 1).map(seat => (
                <option key={seat} value={seat}>
                  座位 {seat}
                </option>
              ))
            }
          </select>
          {(!playerCount || parseInt(playerCount, 10) < 1) && (
            <p className="text-xs text-gray-500 mt-1">请先填写总人数</p>
          )}
        </div>
        <button
          type="submit"
          className="w-full py-2 rounded bg-blue-600 text-white font-medium"
        >生成我的暗号</button>
      </form>

      {/* Share Section */}
      <div className="w-full max-w-md space-y-4">
        <button
          onClick={handleShare}
          disabled={!roomCode || !playerCount}
          className={`w-full py-2 rounded font-medium ${
            !roomCode || !playerCount
              ? 'bg-gray-300 text-gray-500'
              : 'bg-green-600 text-white'
          }`}
        >
          分享房间
        </button>

        {showQR && getShareableURL() && (
          <div className="flex flex-col items-center space-y-4 bg-white p-4 rounded shadow">
            <QRCodeSVG value={getShareableURL()} size={200} />
            <p className="text-sm text-gray-600">扫描二维码加入房间</p>
            <div className="w-full space-y-2">
              <p className="text-xs text-gray-500">分享链接:</p>
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                <input
                  type="text"
                  value={getShareableURL()}
                  readOnly
                  className="flex-1 text-xs bg-transparent border-none outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getShareableURL());
                    alert("链接已复制到剪贴板");
                  }}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  复制
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
