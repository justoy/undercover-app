"use client";
import React, { useState } from "react";

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

  /** Word pairs: [undercoverWord, civilianWord] */
  const wordPairs = [
    ["白天", "夜晚"], ["苹果", "香蕉"], ["篮球", "足球"], ["北京", "上海"], ["猫", "狗"], ["咖啡", "茶"], ["飞机", "火车"], ["海洋", "沙漠"], ["夏天", "冬天"], ["电脑", "手机"],
    ["雨伞", "太阳伞"], ["裙子", "裤子"], ["西瓜", "哈密瓜"], ["铅笔", "钢笔"], ["大象", "长颈鹿"], ["红茶", "绿茶"], ["火锅", "烧烤"], ["火星", "地球"], ["小说", "诗歌"], ["醋", "酱油"],
    ["纸巾", "毛巾"], ["牙刷", "梳子"], ["橄榄球", "棒球"], ["汉堡", "三明治"], ["公交车", "出租车"], ["山峰", "峡谷"], ["棉花", "丝绸"], ["糖", "盐"], ["巧克力", "奶酪"], ["邮票", "硬币"],
    ["照片", "画作"], ["台灯", "吊灯"], ["汉语", "英语"], ["羽毛球", "乒乓球"], ["钢琴", "小提琴"], ["小说家", "诗人"], ["植物", "动物"], ["课堂", "操场"], ["彩虹", "云朵"], ["红酒", "白酒"],
    ["跑步", "游泳"], ["节日", "工作日"], ["警察", "消防员"], ["桥", "隧道"], ["森林", "草原"], ["火焰", "冰雪"], ["按钮", "开关"], ["地图", "指南针"], ["信用卡", "现金"], ["耳机", "音箱"],
    ["辣椒", "胡椒"], ["灯塔", "城堡"], ["票", "证件"], ["雪人", "沙雕"], ["长城", "故宫"], ["钻石", "珍珠"], ["工资", "奖金"], ["裙摆", "袖口"], ["字幕", "配音"], ["黑板", "白板"],
    ["汽油", "柴油"], ["加油站", "停车场"], ["橙汁", "柠檬水"], ["键盘", "鼠标"], ["油画", "水彩"], ["蜡烛", "灯泡"], ["面包", "馒头"], ["外卖", "堂食"], ["瑜伽", "普拉提"], ["早餐", "午餐"],
    ["信用", "贷款"], ["股票", "基金"], ["行李箱", "背包"], ["旋转门", "自动门"], ["颐和园", "圆明园"], ["薯片", "爆米花"], ["芭蕾", "街舞"], ["小说", "剧本"], ["台风", "龙卷风"], ["密码", "指纹"],
    ["电梯", "扶梯"], ["纸船", "木船"], ["围巾", "手套"], ["信号灯", "路牌"], ["火车站", "机场"], ["闪电", "雷声"], ["蜂蜜", "果酱"], ["冰箱", "洗衣机"], ["红豆", "绿豆"], ["棉被", "毯子"],
    ["作业", "考试"], ["雕塑", "壁画"], ["日历", "闹钟"], ["教材", "字典"], ["石头", "沙子"], ["牧羊犬", "猎犬"], ["电视剧", "纪录片"], ["围棋", "象棋"], ["洗发水", "沐浴露"], ["电池", "充电器"],
    ["月球", "太阳"], ["硬盘", "内存"], ["雕刻刀", "剪刀"], ["山羊", "绵羊"], ["连衣裙", "风衣"], ["草莓", "樱桃"], ["书签", "便签"], ["邮局", "银行"], ["客厅", "卧室"], ["广告", "新闻"],
    ["睡袋", "帐篷"], ["口琴", "笛子"], ["诗", "词"], ["水壶", "茶壶"], ["王子", "骑士"], ["雪花", "露珠"], ["菜单", "账单"], ["红包", "礼物"], ["键", "锁"], ["公式", "定理"],
    ["背心", "T恤"], ["日落", "日出"], ["蘑菇", "竹笋"], ["化石", "钻石"], ["购物车", "手推车"], ["糖葫芦", "冰糖葫芦"],
  ];

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
          <label className="block mb-1">你的座位号 / 顺序</label>
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
