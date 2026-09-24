// 탭마다 맨 위에 붙는 "한눈에 보기" 요약을 만듭니다.
// 원래 Apps Script 대시보드의 insightOverview / insightCountry / ... 를 옮긴 것으로,
// 숫자를 보고 문장을 골라내는 규칙(어느 쪽이 끌었는지, 무엇부터 손볼지)을 그대로 따랐습니다.
//
// 돌려주는 모양
//   { tone: 'good' | 'bad' | '', lines: [{ tag, segs }] }
//   segs 는 [{ t: '보통 글자' } | { t: '굵은 글자', b: true }] 입니다.
//   화면에서 굵게 칠할 부분을 미리 나눠 두는 것뿐입니다.

import { fmtCompact, fmtNum } from './format';

const B = (t) => ({ t: String(t), b: true }); // 굵게
const T = (t) => ({ t: String(t) });          // 보통

function line(tag, segs) {
  return { tag, segs: segs.filter(Boolean) };
}

export function pctTxt(p, digits = 1) {
  if (p === null || p === undefined || isNaN(p)) return '—';
  return (p >= 0 ? '+' : '') + p.toFixed(digits) + '%';
}

/** 증감율을 말로 옮깁니다 (원본 gradeWord) */
function gradeWord(p, en) {
  if (p === null || p === undefined || isNaN(p)) return en ? 'not enough data' : '판단 보류';
  if (en) {
    if (p >= 50) return 'very strong growth';
    if (p >= 20) return 'clear growth';
    if (p >= 5) return 'modest growth';
    if (p > -5) return 'essentially flat';
    if (p > -20) return 'a decline';
    return 'a steep decline';
  }
  if (p >= 50) return '매우 강한 성장';
  if (p >= 20) return '뚜렷한 성장';
  if (p >= 5) return '완만한 성장';
  if (p > -5) return '사실상 보합';
  if (p > -20) return '감소';
  return '큰 폭 감소';
}

function toneOf(p) {
  if (p === null || p === undefined || isNaN(p)) return '';
  return p >= 0 ? 'good' : 'bad';
}

const sumField = (arr, key) => (arr || []).reduce((s, x) => s + (x[key] || 0), 0);

function tags(en) {
  return {
    trend: en ? 'Trend' : '트렌드',
    driver: en ? 'Driver' : '동력',
    opp: en ? 'Opportunity' : '기회',
    watch: en ? 'Watch' : '주목',
    fix: en ? 'To fix' : '개선점',
    next: en ? 'Next' : '다음',
  };
}

function nextPromotion(promos) {
  if (!promos || !promos.length) return null;
  const now = new Date();
  const pad2 = (n) => String(n).padStart(2, '0');
  const iso = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  const future = promos.filter((p) => p.start > iso);
  return future.length ? future[0] : null;
}

/* ── Overview ──────────────────────────────────────────────── */

export function insightOverview(data, lang) {
  const en = lang === 'en';
  const G = tags(en);
  const s = data.summary;
  const cs = data.byCountry || [];
  const money = (n) => fmtCompact(n, s.currency, lang);
  const lines = [];

  const g = s.gmvGrowthPct;
  const up = cs.filter((c) => c.growthPct > 0).length;

  // 1) 트렌드 — 전체 성장률, 그리고 특정 국가에 기댄 성과인지
  lines.push(line(G.trend, en
    ? [T('Gmarket Day daily average GMV is '), B(money(s.gdDailyGmv)), T(', '), B(pctTxt(g)),
      T(' vs BAU — ' + gradeWord(g, en) + '. '),
      cs.length ? B(up + ' of ' + cs.length) : null,
      cs.length ? T(' countries are positive' +
        (up === cs.length ? ', so this is not carried by a single market.'
          : up === 0 ? ' — this looks like a problem common to every market.' : '.')) : null]
    : [T('Gmarket Day 일평균 GMV는 '), B(money(s.gdDailyGmv)), T('으로 BAU 대비 '), B(pctTxt(g)),
      T(' — ' + gradeWord(g, en) + '입니다. '),
      cs.length ? T('국가 ' + cs.length + '개 중 ') : null,
      cs.length ? B(up + '개') : null,
      cs.length ? T('가 플러스' +
        (up === cs.length ? '로, 특정 국가에 기댄 성과가 아닙니다.'
          : up === 0 ? '입니다 — 전 국가 공통 문제로 봐야 합니다.' : '입니다.')) : null]));

  // 2) 동력 — 주문건수가 끌었나, 객단가가 끌었나
  const o = s.ordersGrowthPct;
  const a = s.aovGrowthPct;
  if (o !== null && a !== null && !isNaN(o) && !isNaN(a)) {
    const ordersLed = Math.abs(o) >= Math.abs(a) * 1.5;
    const aovLed = Math.abs(a) > Math.abs(o) * 1.5;

    let note;
    if (ordersLed) {
      note = en
        ? (a >= 0 ? (g >= 0 ? ' Traffic and basket size rose together — the healthiest shape.'
                            : ' AOV held up, so the problem is the number of buyers.')
                  : ' AOV fell too, so it is worth checking how much of this leaned on discounting.')
        : (a >= 0 ? (g >= 0 ? ' 유입과 단가가 같이 올라 가장 건강한 형태입니다.'
                            : ' 객단가는 버텼으니, 문제는 사는 사람 수 쪽입니다.')
                  : ' 객단가까지 빠져 할인 의존도가 높지 않은지 볼 필요가 있습니다.');
    } else if (aovLed) {
      note = en
        ? (o >= 0 ? ' Pushing more traffic should leave headroom.'
                  : ' Buyers and basket size fell together — start by checking new-customer acquisition.')
        : (o >= 0 ? ' 트래픽을 더 밀면 여력이 있습니다.'
                  : ' 사는 사람 수와 단가가 같이 빠진 형태라 신규 유입부터 점검이 필요합니다.');
    } else {
      note = en
        ? (g >= 0 ? ' Balanced growth, not leaning on one lever.'
                  : ' No single metric explains it — review the campaign design as a whole.')
        : (g >= 0 ? ' 한쪽에 치우치지 않은 균형 잡힌 성장입니다.'
                  : ' 특정 지표 하나가 아니라 행사 구성 전반을 다시 볼 구간입니다.');
    }

    const word = en ? (g >= 0 ? 'Growth' : 'The decline') : (g >= 0 ? '성장' : '하락');

    if (ordersLed || aovLed) {
      const ledBy = ordersLed
        ? (en ? 'order count (' + pctTxt(o) + ')' : '주문건수(' + pctTxt(o) + ')')
        : (en ? 'AOV (' + pctTxt(a) + ')' : '객단가(' + pctTxt(a) + ')');
      const other = ordersLed
        ? (en ? ', with AOV at ' + pctTxt(a) + '.' : '가 주도했고 객단가는 ' + pctTxt(a) + '입니다.')
        : (en ? ', with orders at ' + pctTxt(o) + '.' : '가 주도했고 주문건수는 ' + pctTxt(o) + '입니다.');
      lines.push(line(G.driver, en
        ? [T(word + ' was driven by '), B(ledBy), T(other + note)]
        : [T(word + '은 '), B(ledBy), T(other + note)]));
    } else {
      lines.push(line(G.driver, en
        ? [T(word + ' came from orders (' + pctTxt(o) + ') and AOV (' + pctTxt(a) + ') in '),
          B('similar measure'), T('.' + note)]
        : [T(word + '은 주문건수(' + pctTxt(o) + ')와 객단가(' + pctTxt(a) + ')가 '),
          B('비슷한 폭'), T('입니다.' + note)]));
    }
  }

  // 3) 다음 — 예산 여력과 다음 일정
  const tail = [];
  const spend = sumField(cs, 'spend');
  const bud = sumField(cs, 'budget');
  // 광고비가 비어 있으면 사용율이 늘 0% 라 '여력이 남았다' 는 잘못된 조언이 됩니다
  if (bud > 0 && data.hasBudgetData) {
    const used = (spend / bud) * 100;
    const verdict = used < 70
      ? (g >= 0
        ? (en ? ' — room left to put more behind the next campaign'
              : ' — 여력이 남아 다음 행사에 더 실을 수 있습니다')
        : (en ? ' — but results trailed BAU, so review where it went before adding more'
              : ' — 다만 성과가 BAU에 못 미쳤으니 증액보다 집행처 점검이 먼저입니다'))
      : used > 100
        ? (en ? ' — already over, so the next campaign needs a fresh allocation'
              : ' — 이미 초과라 다음 행사는 배분을 다시 짜야 합니다')
        : (en ? ' — close to plan' : ' — 거의 계획대로 집행됐습니다');
    tail.push(...(en
      ? [B(used.toFixed(1) + '%'), T(' of budget spent' + verdict)]
      : [T('예산은 '), B(used.toFixed(1) + '%'), T(' 사용' + verdict)]));
  }
  const np = nextPromotion(data.promotions);
  if (np) {
    const when = np.start.slice(5).replace('-', '/');
    if (tail.length) tail.push(T('. '));
    tail.push(T(en ? 'Next up is ' : '다음 일정은 '), B(np.name),
      T('(' + when + (np.country ? ' · ' + np.country : '') + ')' + (en ? '.' : '입니다.')));
  }
  if (tail.length) lines.push(line(G.next, tail));

  return { tone: toneOf(g), lines };
}

/* ── By Country ────────────────────────────────────────────── */

export function insightCountry(data, lang) {
  const en = lang === 'en';
  const G = tags(en);
  const cs = (data.byCountry || []).filter((c) => c.growthPct !== null);
  if (!cs.length) return null;

  const money = (n) => fmtCompact(n, data.summary.currency, lang);
  const lines = [];

  const byGrowth = cs.slice().sort((a, b) => b.growthPct - a.growthPct);
  const best = byGrowth[0];
  const worst = byGrowth[byGrowth.length - 1];
  const top = data.byCountry[0];
  const spread = best.growthPct - worst.growthPct;
  const allDown = best.growthPct < 0;

  // 1) 트렌드 — 최고/최저 국가와 격차
  lines.push(line(G.trend, en
    ? [T(allDown ? 'Every country came in below BAU. The mildest is ' : 'The strongest is '),
      B(best.country + ' ' + pctTxt(best.growthPct)), T(' and the weakest '),
      B(worst.country + ' ' + pctTxt(worst.growthPct)),
      T(' — a ' + spread.toFixed(0) + 'pp spread, ' +
        (spread < 20 ? 'so all markets moved together.' : 'wide enough to look at each market separately.'))]
    : [T(allDown ? '전 국가가 BAU를 밑돌았습니다. 가장 선방한 곳이 ' : '증감율은 '),
      B(best.country + ' ' + pctTxt(best.growthPct)),
      T(allDown ? ', 가장 나쁜 곳이 ' : '가 가장 높고 '),
      B(worst.country + ' ' + pctTxt(worst.growthPct)),
      T((allDown ? '입니다 — ' : '가 가장 낮습니다 — ') +
        (spread < 20 ? '격차가 ' + spread.toFixed(0) + '%p로 좁아 국가들이 고르게 움직였습니다.'
                     : '격차가 ' + spread.toFixed(0) + '%p로 커서 국가별 편차를 따로 봐야 합니다.'))]));

  // 2) 기회 — 규모 1위와 성장 1위가 다르면 거기에 여력이 있습니다
  const tagOpp = allDown ? G.watch : G.opp;
  if (top && best.country !== top.country) {
    const share = ((top.gdDailyGmv / sumField(cs, 'gdDailyGmv')) * 100).toFixed(0);
    const budgetRoom = data.hasBudgetData && best.budgetUsedPct !== null &&
      best.budgetUsedPct !== undefined && best.budgetUsedPct < 80;
    const advice = budgetRoom
      ? (en ? best.country + ' has spent only ' + best.budgetUsedPct.toFixed(0) + '% of its budget — worth a bigger share next time.'
            : best.country + '는 예산도 ' + best.budgetUsedPct.toFixed(0) + '%만 썼으니 다음엔 배분을 늘릴 만합니다.')
      : (en ? 'Adding stock and exposure in ' + best.country + ' should leave room to grow.'
            : best.country + '에 재고·노출을 더 붙이면 성장 여력이 있습니다.');
    lines.push(line(tagOpp, en
      ? [B(top.country), T(' is the largest market (' + money(top.gdDailyGmv) + ' daily, ' + share + '% of the total), but '),
        B(best.country), T((allDown ? ' is holding up best. ' : ' is growing fastest. ') + advice)]
      : [T('규모는 '), B(top.country), T('(일평균 ' + money(top.gdDailyGmv) + ', 전체의 ' + share + '%)가 1위지만 '),
        T(allDown ? '덜 빠진 쪽은 ' : '성장은 '), B(best.country),
        T((allDown ? '입니다. ' : '이 가장 빠릅니다. ') + advice)]));
  } else if (top) {
    lines.push(line(tagOpp, en
      ? [B(top.country), T(' leads on both size (' + money(top.gdDailyGmv) +
        ' daily) and growth, which is a concentration risk. Lifting the growth rate of the 2nd and 3rd markets is the next task.')]
      : [B(top.country), T('이 규모(일평균 ' + money(top.gdDailyGmv) +
        ')와 성장을 모두 이끌고 있어 쏠림이 있습니다. 2~3위 국가의 성장률을 끌어올리는 쪽이 다음 과제입니다.')]));
  }

  // 3) 개선점 — 전환율이 낮은 곳 / 예산 초과 / K브랜드 비중이 낮은 곳
  const conv = cs.filter((c) => c.conversionPct !== null && c.conversionPct > 0)
    .sort((a, b) => a.conversionPct - b.conversionPct);
  const over = data.hasBudgetData
    ? cs.filter((c) => c.budgetUsedPct !== null && c.budgetUsedPct > 100)
    : [];
  const third = [];

  const convGap = conv.length >= 2 ? conv[conv.length - 1].conversionPct - conv[0].conversionPct : 0;
  if (conv.length >= 2 && convGap >= 0.1) {
    const hi = conv[conv.length - 1];
    third.push(...(en
      ? [T('Conversion is lowest in '), B(conv[0].country + ' ' + conv[0].conversionPct.toFixed(2) + '%'),
        T(' (highest: ' + hi.country + ' ' + hi.conversionPct.toFixed(2) +
          '%) — check the product page and pricing before spending more on traffic. ')]
      : [T('전환율은 '), B(conv[0].country + ' ' + conv[0].conversionPct.toFixed(2) + '%'),
        T('가 가장 낮습니다(최고 ' + hi.country + ' ' + hi.conversionPct.toFixed(2) +
          '%) — 트래픽보다 상세페이지·가격 쪽을 먼저 점검할 구간입니다. ')]));
  }
  if (over.length) {
    third.push(T(en ? 'Over budget: ' : '예산을 넘긴 국가는 '));
    over.forEach((c, i) => {
      third.push(B(c.country + '(' + c.budgetUsedPct.toFixed(0) + '%)'));
      third.push(T(i < over.length - 1 ? ', ' : en ? '. ' : '입니다. '));
    });
  }
  if (!third.length) {
    const kSorted = cs.filter((c) => c.kbrandShare !== null).sort((a, b) => a.kbrandShare - b.kbrandShare);
    const kGap = kSorted.length >= 2 ? kSorted[kSorted.length - 1].kbrandShare - kSorted[0].kbrandShare : 0;
    const lowK = kSorted[0];
    if (lowK && (kGap >= 3 || lowK.kbrandShare < 60)) {
      third.push(...(en
        ? [T('K-brand share is lowest in '), B(lowK.country + ' (' + lowK.kbrandShare.toFixed(1) + '%)'),
          T(' — the market with the most room to add K-brand listings and exposure.')]
        : [T('K브랜드 비중이 가장 낮은 곳은 '), B(lowK.country + '(' + lowK.kbrandShare.toFixed(1) + '%)'),
          T('입니다 — K브랜드 입점·노출을 늘릴 여지가 가장 큰 국가입니다.')]));
    } else {
      third.push(...(en
        ? [T('Conversion, K-brand share and budget spend vary little between countries — rather than rebalancing by market, growing the absolute size of the smaller ones such as '),
          B(worst.country), T(' is the more efficient move.')]
        : [T('전환율·K브랜드 비중·예산 집행 모두 국가별 편차가 크지 않습니다 — 지금은 국가별 조정보다 '),
          B(worst.country), T(' 같은 하위권의 절대 규모를 키우는 쪽이 효율적입니다.')]));
    }
  }
  if (third.length) lines.push(line(G.fix, third));

  return { tone: toneOf(allDown ? worst.growthPct : 1), lines };
}

/* ── By Category ───────────────────────────────────────────── */

export function insightCategory(rows, lang) {
  const en = lang === 'en';
  const G = tags(en);
  if (!rows || !rows.length) return null;

  const lines = [];
  const total = sumField(rows, 'dailyGmv');
  const withG = rows.filter((r) => r.growthPct !== null && !isNaN(r.growthPct));
  const top2 = rows.slice(0, 2);
  const top2Share = total ? (sumField(top2, 'dailyGmv') / total) * 100 : 0;
  const names = top2.map((r) => r.category).join(', ');

  // 1) 트렌드 — 상위 2개 쏠림 정도
  lines.push(line(G.trend, en
    ? [T('The top two ('), B(names), T(') hold '), B(top2Share.toFixed(0) + '%'),
      T(' of daily average GMV — ' +
        (top2Share >= 60 ? 'concentrated enough that their stock and exposure decide the whole campaign.'
                         : 'spread fairly evenly, so one wobbling category will not shake the total.'))]
    : [T('상위 2개('), B(names), T(')가 일평균 GMV의 '), B(top2Share.toFixed(0) + '%'),
      T('를 차지합니다 — ' +
        (top2Share >= 60 ? '쏠림이 커서 이 둘의 재고와 노출이 행사 전체를 좌우합니다.'
                         : '비교적 고르게 분산돼 있어 한 카테고리가 흔들려도 전체가 크게 흔들리진 않습니다.'))]));

  // 2) 기회 — 비중 2% 이상 중 가장 빠르게 큰 카테고리
  const meaningful = withG.filter((r) => total && (r.dailyGmv / total) * 100 >= 2);
  if (meaningful.length) {
    const fast = meaningful.slice().sort((a, b) => b.growthPct - a.growthPct)[0];
    const share = (fast.dailyGmv / total) * 100;
    if (fast.growthPct < 0) {
      lines.push(line(G.watch, en
        ? [T('Even the best performer, '), B(fast.category), T(', is at ' + pctTxt(fast.growthPct) +
          ' — every category above 2% share came in below BAU, which points at the campaign design rather than any one category.')]
        : [T('가장 선방한 '), B(fast.category), T('도 ' + pctTxt(fast.growthPct) +
          '로, 비중 2% 이상 카테고리가 모두 BAU를 밑돌았습니다 — 카테고리 문제가 아니라 행사 설계 전반을 봐야 합니다.')]));
    } else {
      lines.push(line(G.opp, en
        ? [T('The fastest riser is '), B(fast.category), T(' (' + pctTxt(fast.growthPct) + ') at '),
          B(share.toFixed(1) + '%'), T(' of the mix' +
            (share < 20 ? ' — the place where adding volume would lift the total the most.'
                        : ', so it is already a core category — holding the current allocation is the safe call.'))]
        : [T('가장 빠르게 큰 건 '), B(fast.category), T('(' + pctTxt(fast.growthPct) + ')인데 비중은 '),
          B(share.toFixed(1) + '%'), T(share < 20 ? '에 그칩니다 — 물량을 더 붙였을 때 전체를 밀어 올릴 여지가 가장 큰 구간입니다.'
                                                  : '로 이미 주력입니다 — 지금 배분을 유지하는 게 안전합니다.')]));
    }
  }

  // 3) 개선점 — 역성장 / 객단가 하락 / 미분류
  const down = withG.filter((r) => r.growthPct < 0).sort((a, b) => a.growthPct - b.growthPct);
  const aovDown = rows.filter((r) => r.aovGrowthPct !== null && r.aovGrowthPct < -5);
  const unc = rows.find((r) => r.category === '(미분류)');
  const uncShare = unc && total ? (unc.dailyGmv / total) * 100 : 0;

  if (down.length) {
    const segs = [T(en ? 'Behind BAU: ' : 'BAU보다 뒤진 카테고리는 ')];
    down.slice(0, 3).forEach((r, i, arr) => {
      segs.push(B(r.category + '(' + pctTxt(r.growthPct) + ')'));
      segs.push(T(i < arr.length - 1 ? ', ' : ''));
    });
    segs.push(T(en ? ' — start by checking whether the campaign offer actually applied and whether anything went out of stock.'
                   : '입니다 — 행사 혜택이 제대로 걸렸는지, 품절은 없었는지부터 확인해 보세요.'));
    lines.push(line(G.fix, segs));
  } else if (aovDown.length) {
    const segs = [T(en ? 'AOV fell in ' : '객단가가 빠진 카테고리는 ')];
    aovDown.slice(0, 3).forEach((r, i, arr) => {
      segs.push(B(r.category + '(' + pctTxt(r.aovGrowthPct) + ')'));
      segs.push(T(i < arr.length - 1 ? ', ' : ''));
    });
    segs.push(T(en ? ' — volume grew but discounting was deep, so check margin alongside it.'
                   : '입니다 — 물량은 늘었어도 할인 폭이 컸다는 뜻이라 수익성을 같이 봐야 합니다.'));
    lines.push(line(G.fix, segs));
  } else if (uncShare >= 3) {
    lines.push(line(G.fix, en
      ? [B('(Uncategorised)'), T(' rows are '), B(uncShare.toFixed(1) + '%'),
        T(' of daily average GMV — filling the category column in the daily-performance sheet will make this table more accurate.')]
      : [T('카테고리가 비어 있는 '), B('(미분류)'), T('가 일평균 GMV의 '), B(uncShare.toFixed(1) + '%'),
        T('입니다 — 일별실적 시트의 카테고리 칸을 채우면 이 표가 더 정확해집니다.')]));
  } else {
    lines.push(line(G.fix, [T(en
      ? 'No category came in below BAU. The remaining task is to protect AOV in the top categories while giving the smaller ones more exposure.'
      : '역성장한 카테고리가 없습니다. 다음 행사에서는 상위 카테고리의 객단가를 지키면서 하위 카테고리 노출을 늘리는 쪽이 남은 과제입니다.')]));
  }

  return { tone: toneOf(withG.length ? sumField(withG, 'growthPct') / withG.length : null), lines };
}

/* ── By Brand ──────────────────────────────────────────────── */

export function insightBrand(src, lang) {
  const en = lang === 'en';
  const G = tags(en);
  if (!src || !src.rows || !src.rows.length) return null;

  const rows = src.rows;
  const lines = [];
  const total = sumField(rows, 'dailyGmv');
  const top = rows[0];
  const top5Share = total ? (sumField(rows.slice(0, 5), 'dailyGmv') / total) * 100 : 0;

  // 1) 트렌드 — 상위 5개 의존도
  lines.push(line(G.trend, en
    ? [T('Of '), B(fmtNum(src.total, lang)), T(' brands, the top 5 hold '), B(top5Share.toFixed(0) + '%'),
      T(' of daily average GMV — ' +
        (top5Share >= 50 ? 'a heavy dependence: losing any one of them would move the whole campaign. '
                         : 'no heavy dependence on a few names, which makes the mix fairly stable. ')),
      B(top.name), T(' leads with ' + (top.sharePct || 0).toFixed(1) + '%.')]
    : [T('브랜드 '), B(fmtNum(src.total, lang) + '개'), T(' 중 상위 5개가 일평균 GMV의 '),
      B(top5Share.toFixed(0) + '%'),
      T('를 차지합니다 — ' +
        (top5Share >= 50 ? '소수 브랜드 의존도가 높아, 이들 중 하나만 빠져도 행사 전체가 흔들립니다. '
                         : '상위 브랜드 의존도가 높지 않아 비교적 안정적인 구조입니다. ')),
      T('1위는 '), B(top.name), T('(' + (top.sharePct || 0).toFixed(1) + '%)입니다.')]));

  // 2) 기회 — BAU 대비 순위가 가장 많이 오른 브랜드
  const risers = rows.filter((r) => r.rankDelta !== null && r.rankDelta > 0)
    .sort((a, b) => b.rankDelta - a.rankDelta);
  const fallers = rows.filter((r) => r.rankDelta !== null && r.rankDelta < 0)
    .sort((a, b) => a.rankDelta - b.rankDelta);

  if (risers.length) {
    const u = risers[0];
    lines.push(line(G.opp, en
      ? [T('The biggest climber vs BAU is '), B(u.name), T(' (#' + u.bauRank + ' → '), B('#' + u.rank),
        T(', ' + pctTxt(u.growthPct) + ') — the brand that responded best to the campaign, and the first candidate for exposure next time.')]
      : [T('BAU 대비 순위가 가장 많이 오른 곳은 '), B(u.name), T('(' + u.bauRank + '위 → '), B(u.rank + '위'),
        T(', ' + pctTxt(u.growthPct) + ')입니다 — 행사 반응이 가장 좋은 브랜드라 다음 행사에서 노출을 먼저 배정할 후보입니다.')]));
  }

  // 3) 개선점 — 가장 많이 내려간 브랜드 + K브랜드 비중
  const third = [];
  if (fallers.length) {
    const dn = fallers[0];
    third.push(...(en
      ? [T('The biggest faller is '), B(dn.name), T(' (#' + dn.bauRank + ' → #' + dn.rank + ', ' +
        pctTxt(dn.growthPct) + ') — worth checking stock, price and exposure. ')]
      : [T('가장 많이 내려간 곳은 '), B(dn.name), T('(' + dn.bauRank + '위 → ' + dn.rank + '위, ' +
        pctTxt(dn.growthPct) + ')입니다 — 재고·가격·노출 중 무엇이 막혔는지 확인이 필요합니다. ')]));
  }
  const kDaily = rows.reduce((s, r) => s + (r.isK ? r.dailyGmv : 0), 0);
  if (total) {
    const kp = ((kDaily / total) * 100).toFixed(1);
    third.push(...(en
      ? [T('K-brands account for '), B(kp + '%'), T('.')]
      : [T('K브랜드 비중은 '), B(kp + '%'), T('입니다.')]));
  }
  if (third.length) lines.push(line(G.fix, third));

  return { tone: toneOf(top.growthPct), lines };
}

/* ── By Item ───────────────────────────────────────────────── */

export function insightItem(rows, currency, lang) {
  const en = lang === 'en';
  const G = tags(en);
  if (!rows || !rows.length) return null;

  const money = (n) => fmtCompact(n, currency, lang);
  const lines = [];
  const total = rows.reduce((s, r) => s + r._gmv, 0);
  const top = rows[0];
  const share = total ? (rows.slice(0, 10).reduce((s, r) => s + r._gmv, 0) / total) * 100 : 0;

  // 1) 트렌드 — 1위 상품과 상위 10개 집중도
  lines.push(line(G.trend, en
    ? [B(fmtNum(rows.length, lang)), T(' products · '), B(top.name || top.code),
      T(' leads (' + money(top._gmv) + ') · the top 10 hold '), B(share.toFixed(0) + '%'), T('.')]
    : [T('상품 '), B(fmtNum(rows.length, lang) + '개'), T(' · 1위는 '), B(top.name || top.code),
      T('(' + money(top._gmv) + ') · 상위 10개가 '), B(share.toFixed(0) + '%'), T('를 차지합니다.')]));

  // 2) 기회 — BAU 대비 성장한 상품 비율과 가장 크게 뛴 상품
  const withG = rows.filter((r) => r.gmvGrowthPct !== null && r.gmvGrowthPct !== undefined && !isNaN(r.gmvGrowthPct));
  if (withG.length) {
    const up = withG.filter((r) => r.gmvGrowthPct > 0).length;
    const pct = ((up / withG.length) * 100).toFixed(0);
    const best = withG.slice().sort((a, b) => b.gmvGrowthPct - a.gmvGrowthPct)[0];
    lines.push(line(G.opp, en
      ? [B(up + ' products'), T(' (' + pct + '%) grew vs BAU, and the biggest jump is '),
        B(best.name || best.code), T(' (' + pctTxt(best.gmvGrowthPct) + ') — the first candidate for exposure next campaign.')]
      : [T('BAU 대비 성장한 상품은 '), B(up + '개'), T('(' + pct + '%)이고, 가장 크게 뛴 건 '),
        B(best.name || best.code), T('(' + pctTxt(best.gmvGrowthPct) + ')입니다 — 다음 행사 노출 후보로 먼저 볼 상품입니다.')]));
  }

  // 3) 개선점 — 객단가 급락 / BAU 판매 없던 상품 / 역성장 상품
  const aovRows = rows.filter((r) => r.aovGrowthPct !== null && r.aovGrowthPct !== undefined);
  const aovDown = aovRows.filter((r) => r.aovGrowthPct < -10);
  if (aovRows.length && aovDown.length) {
    lines.push(line(G.fix, en
      ? [B(aovDown.length + ' products'), T(' lost more than 10% of AOV — units grew but discounting was deep, so check margin alongside it.')]
      : [T('AOV가 10% 넘게 빠진 상품이 '), B(aovDown.length + '개'),
        T('입니다 — 수량은 늘어도 할인 폭이 컸다는 뜻이라, 마진을 같이 확인할 구간입니다.')]));
  } else {
    const noBau = rows.filter((r) => r.bauGmv === 0).length;
    const fall = rows.filter((r) => r.gmvGrowthPct !== null && r.gmvGrowthPct < 0)
      .sort((a, b) => a.gmvGrowthPct - b.gmvGrowthPct);
    if (noBau) {
      lines.push(line(G.fix, en
        ? [B(noBau + ' products'), T(' had no BAU sales — campaign-only stock, so read them by absolute volume rather than by growth rate.')]
        : [T('BAU 기간에 판매가 없던 상품이 '), B(noBau + '개'),
          T(' 포함돼 있습니다 — 행사 전용으로 풀린 물량이라 증감율 대신 절대 판매량으로 보셔야 합니다.')]));
    } else if (fall.length) {
      lines.push(line(G.fix, en
        ? [B(fall.length + ' products'), T(' came in below BAU, the worst being '), B(fall[0].name || fall[0].code),
          T(' (' + pctTxt(fall[0].gmvGrowthPct) + ') — check stock, price and exposure.')]
        : [T('BAU보다 뒤진 상품은 '), B(fall.length + '개'), T('이고, 가장 많이 빠진 건 '),
          B(fall[0].name || fall[0].code), T('(' + pctTxt(fall[0].gmvGrowthPct) + ')입니다 — 품절·가격·노출 중 무엇이 막혔는지 확인해 보세요.')]));
    } else if (!withG.length) {
      lines.push(line(G.fix, [T(en
        ? 'None of these products sold during the BAU period, so there is no growth rate to compare — read them by absolute volume.'
        : '이 상품들은 BAU 기간 판매 기록이 없어 증감율을 낼 수 없습니다 — 절대 판매량으로 보셔야 합니다.')]));
    } else {
      lines.push(line(G.fix, [T(en
        ? 'Nothing here came in below BAU and no product lost much AOV — keep the current mix and give the smaller products more exposure.'
        : '이 범위에서는 BAU보다 뒤진 상품도, AOV가 크게 빠진 상품도 없습니다 — 지금 구성을 유지하면서 하위 상품의 노출을 늘리는 쪽이 남은 과제입니다.')]));
    }
  }

  return { tone: toneOf(top.gmvGrowthPct), lines };
}

/* ── Keyword Trend ─────────────────────────────────────────── */

export function insightKeyword(trend, rising, keyword, lang) {
  const en = lang === 'en';
  const G = tags(en);
  const lines = [];

  const kws = ((trend && trend.keywords) || []).filter((k) => !k.isAnchor);
  const untapped = kws.filter((k) => k.untapped);
  const surging = kws.filter((k) => k.wowPct !== null && k.wowPct > 0)
    .sort((a, b) => b.wowPct - a.wowPct);

  // 1) 트렌드 — 추적 중인 키워드와 가장 많이 오른 검색어
  if (kws.length) {
    const seg = [en ? T('Tracking ') : T('추적 중인 키워드는 '),
      B(fmtNum(kws.length, lang) + (en ? ' keywords' : '개')),
      T(en ? ' across ' + (trend.countries || []).length + ' markets'
           : ', ' + (trend.countries || []).length + '개국 기준입니다')];
    if (surging.length) {
      const s0 = surging[0];
      seg.push(T(en ? '. The biggest weekly riser is ' : '. 전주 대비 가장 많이 오른 건 '));
      seg.push(B(s0.keyword + ' (' + pctTxt(s0.wowPct) + ')'));
      seg.push(T(en ? '.' : '입니다.'));
    } else {
      seg.push(T(en ? '.' : '.'));
    }
    lines.push(line(G.trend, seg));
  }

  // 2) 기회 — 검색은 많은데 우리가 아직 안 파는 브랜드
  if (untapped.length) {
    const u = untapped.slice().sort((a, b) => (b.value || 0) - (a.value || 0))[0];
    lines.push(line(G.opp, en
      ? [B(untapped.length + ' brand keywords'), T(' get search but have no sales on our side. The largest is '),
        B(u.keyword), T(' (index ' + (u.value === null ? '—' : u.value) + ', ' + u.country +
          ') — the first candidate to source or list.')]
      : [T('검색은 되는데 우리가 아직 안 파는 브랜드 키워드가 '), B(untapped.length + '개'), T('입니다. 그중 가장 큰 건 '),
        B(u.keyword), T('(지수 ' + (u.value === null ? '—' : u.value) + ', ' + u.country +
          ')입니다 — 소싱·입점을 먼저 검토할 후보입니다.')]));
  } else if (rising && rising.length) {
    const r0 = rising[0];
    lines.push(line(G.opp, en
      ? [T('Breakout query '), B(r0.query), T(' (' + r0.growth + ', ' + r0.country + ') is worth a sourcing check.')]
      : [T('급상승 검색어 '), B(r0.query), T('(' + r0.growth + ', ' + r0.country + ')는 소싱 검토를 해볼 만합니다.')]));
  }

  // 3) 개선점 — 검색 순위는 높은데 우리 매출 순위가 뒤처지는 키워드
  const gaps = kws.filter((k) => k.sold && k.opportunity !== null && k.opportunity > 0)
    .sort((a, b) => b.opportunity - a.opportunity);
  if (gaps.length) {
    const g0 = gaps[0];
    lines.push(line(G.fix, en
      ? [B(g0.keyword), T(' ranks #' + g0.searchRank + ' in search but our sales rank is #' + g0.brandRank +
        ' — we already carry it, so exposure and pricing are the levers, not sourcing.')]
      : [B(g0.keyword), T('는 검색 ' + g0.searchRank + '위인데 우리 매출은 ' + g0.brandRank +
        '위입니다 — 이미 취급 중이므로 소싱이 아니라 노출·가격을 손볼 구간입니다.')]));
  } else if (!kws.length) {
    lines.push(line(G.fix, [T(en
      ? 'No search-trend data yet — fill the 검색트렌드 sheet tab to see which keywords are growing.'
      : '검색트렌드 데이터가 아직 없습니다 — 구글시트 검색트렌드 탭을 채우면 어떤 키워드가 크는지 볼 수 있습니다.')]));
  } else {
    lines.push(line(G.fix, [T(en
      ? 'Every tracked brand keyword is already covered by something we sell — keep watching the breakout queries for the next gap.'
      : '추적 중인 브랜드 키워드는 모두 우리가 취급하는 상품과 연결돼 있습니다 — 다음 빈틈은 급상승 검색어 쪽에서 찾는 게 좋습니다.')]));
  }

  return { tone: '', lines };
}
