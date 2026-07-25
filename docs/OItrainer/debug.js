/*
    debug.js: 调试代码
    包含用于开发和测试的辅助函数。
*/

/**
 * 调试函数：生成超强学生并跳转到第二年NOI
 * 使用方法：在浏览器控制台中输入 debugzak() 即可
 */
function debugzak() {
  if(typeof game === 'undefined' || !game) {
    console.error('游戏未初始化，请先开始游戏');
    alert('请先开始游戏再使用调试功能');
    return;
  }
  
  console.log('🔧 [调试] 开始生成超强学生并跳转到NOI...');
  
  game.students = [];
  
  const superStudent = new Student('zak', 500, 500, 500);
  superStudent.knowledge_ds = 500;
  superStudent.knowledge_graph = 500;
  superStudent.knowledge_string = 500;
  superStudent.knowledge_math = 500;
  superStudent.knowledge_dp = 500;
  superStudent.pressure = 0;
  superStudent.comfort = 100;
  superStudent.sick_weeks = 0;
  superStudent.active = true;
  
  game.students.push(superStudent);
  console.log('✅ [调试] 已创建超强学生：', superStudent.name);
  
  game.budget = 1000000;
  console.log('✅ [调试] 已设置经费：¥1,000,000');
  
  const secondYearNOI = competitions.find(c => c.name === 'NOI' && c.week > WEEKS_PER_HALF);
  const targetWeek = secondYearNOI ? secondYearNOI.week - 1 : 27;
  
  if(game.week < targetWeek) {
    const weeksToJump = targetWeek - game.week;
    console.log(`⏭️ [调试] 从第${game.week}周跳转到第${targetWeek}周（跳过${weeksToJump}周）...`);
    game.week = targetWeek;
  }
  
  const halfIndex = 1;
  if(!game.qualification[halfIndex]) {
    game.qualification[halfIndex] = {};
  }
  
  for(let compName of COMPETITION_ORDER) {
    if(!game.qualification[halfIndex][compName]) {
      game.qualification[halfIndex][compName] = new Set();
    }
    game.qualification[halfIndex][compName].add(superStudent.name);
  }
  console.log('✅ [调试] 已授予所有比赛晋级资格');
  
  if(!game.completedCompetitions) {
    game.completedCompetitions = new Set();
  }
  
  for(let comp of competitions) {
    if(comp.week < targetWeek && comp.week > WEEKS_PER_HALF) {
      const key = `${halfIndex}_${comp.name}_${comp.week}`;
      game.completedCompetitions.add(key);
    }
  }
  console.log('✅ [调试] 已标记完成前序比赛');
  
  game.updateWeather();
  
  if(typeof renderAll === 'function') {
    renderAll();
  }
  
  
  alert(`🔧 已创建"${superStudent.name}"\n 已跳转到第${game.week}周\n 已授予所有晋级资格\n`);
}

/**
 * 调试函数：直接打开设施升级页面
 * 使用方法：在浏览器控制台中输入 debugFacility() 即可
 */
function debugFacility() {
  if(typeof game === 'undefined' || !game) {
    console.error('游戏初始化，请先开始游戏');
    alert('请先开始游戏再使用调试功能');
    return;
  }

  if(typeof showFacilityUpgradeModal === 'function') {
    console.log('[调试] 打开设施升级页面...');
    showFacilityUpgradeModal();
  } else {
    console.error('showFacilityUpgradeModal 函数未加载');
    alert('设施升级模块未加载，请检查 facilities.js 是否已引入');
  }
}

/* ===== 作弊系统（点击10次触发） ===== */
(function(){
  const CHEAT_CLICKS = 10;
  const CHEAT_TIMEOUT = 3000; // 3秒内未达到次数则重置

  // 点击计数器：{ key: { count, lastTime } }
  const counters = {};

  function trackClick(key) {
    const now = Date.now();
    if(!counters[key] || (now - counters[key].lastTime) > CHEAT_TIMEOUT) {
      counters[key] = { count: 0, lastTime: now };
    }
    counters[key].count++;
    counters[key].lastTime = now;
    return counters[key].count;
  }

  // 简易toast提示
  function cheatToast(msg) {
    const el = document.createElement('div');
    el.textContent = msg;
    Object.assign(el.style, {
      position: 'fixed', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
      background: '#1a202c', color: '#fff', padding: '8px 20px', borderRadius: '8px',
      fontSize: '13px', zIndex: '99999', pointerEvents: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'opacity 0.3s',
      fontFamily: 'system-ui, sans-serif'
    });
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, 1500);
    setTimeout(() => { el.remove(); }, 1900);
  }

  function safeShowModal(html) {
    if(typeof showModal === 'function') {
      showModal(html);
    } else {
      // fallback: 简易模态
      const overlay = document.createElement('div');
      overlay.id = 'cheat-modal-overlay';
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '99998'
      });
      const dialog = document.createElement('div');
      Object.assign(dialog.style, {
        background: '#fff', borderRadius: '12px', padding: '20px', maxWidth: '460px',
        width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      });
      dialog.innerHTML = html;
      overlay.appendChild(dialog);
      overlay.addEventListener('click', function(e) {
        if(e.target === overlay) overlay.remove();
      });
      document.body.appendChild(overlay);
    }
  }

  function closeModalSafe() {
    if(typeof closeModal === 'function') {
      closeModal();
    } else {
      const ol = document.getElementById('cheat-modal-overlay');
      if(ol) ol.remove();
    }
  }

  // ===== 经费作弊 =====
  function openBudgetCheat() {
    safeShowModal(`
      <h3 style="margin:0 0 12px 0;">[作弊] 修改经费</h3>
      <div style="font-size:14px;color:#555;margin-bottom:12px;">当前经费: ¥${game.budget}</div>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button class="btn" onclick="window._cheatSetBudget(100000)" style="font-size:13px;">+10万</button>
        <button class="btn" onclick="window._cheatSetBudget(500000)" style="font-size:13px;">+50万</button>
        <button class="btn" onclick="window._cheatSetBudget(1000000)" style="font-size:13px;">+100万</button>
        <button class="btn" onclick="window._cheatSetBudget(9999999)" style="font-size:13px;">∞</button>
      </div>
      <div style="margin-bottom:10px;">
        <label style="font-size:13px;color:#666;">自定义金额：</label>
        <input type="number" id="cheat-budget-input" value="${game.budget}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;margin-top:4px;" />
      </div>
      <div class="modal-actions" style="margin-top:12px;">
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn" id="cheat-budget-confirm">确认修改</button>
      </div>
    `);
    setTimeout(() => {
      const btn = document.getElementById('cheat-budget-confirm');
      if(btn) btn.onclick = () => {
        const v = parseInt(document.getElementById('cheat-budget-input').value);
        if(!isNaN(v)) {
          game.budget = v;
          cheatToast(`经费已修改为 ¥${v.toLocaleString()}`);
          renderAll();
        }
        closeModalSafe();
      };
    }, 50);
  }
  window._cheatSetBudget = function(v) {
    game.budget = v;
    cheatToast(`经费已修改为 ¥${v.toLocaleString()}`);
    renderAll();
    closeModalSafe();
  };

  // ===== 声誉作弊 =====
  function openReputationCheat() {
    safeShowModal(`
      <h3 style="margin:0 0 12px 0;">[作弊] 修改声誉</h3>
      <div style="font-size:14px;color:#555;margin-bottom:12px;">当前声誉: ${game.reputation}</div>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button class="btn" onclick="window._cheatSetRep(10)" style="font-size:13px;">+10</button>
        <button class="btn" onclick="window._cheatSetRep(30)" style="font-size:13px;">+30</button>
        <button class="btn" onclick="window._cheatSetRep(50)" style="font-size:13px;">+50</button>
        <button class="btn" onclick="window._cheatSetRep(100)" style="font-size:13px;">满值</button>
      </div>
      <div style="margin-bottom:10px;">
        <label style="font-size:13px;color:#666;">自定义数值（0-100）：</label>
        <input type="number" id="cheat-rep-input" value="${game.reputation}" min="0" max="100" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;margin-top:4px;" />
      </div>
      <div class="modal-actions" style="margin-top:12px;">
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn" id="cheat-rep-confirm">确认修改</button>
      </div>
    `);
    setTimeout(() => {
      const btn = document.getElementById('cheat-rep-confirm');
      if(btn) btn.onclick = () => {
        const v = clampInt(parseInt(document.getElementById('cheat-rep-input').value), 0, 100);
        game.reputation = v;
        cheatToast(`声誉已修改为 ${v}`);
        renderAll();
        closeModalSafe();
      };
    }, 50);
  }
  window._cheatSetRep = function(v) {
    game.reputation = clampInt(v, 0, 100);
    cheatToast(`声誉已修改为 ${game.reputation}`);
    renderAll();
    closeModalSafe();
  };

  // ===== 学生作弊 =====
  function openStudentCheat(studentName) {
    const student = game.students.find(s => s.name === studentName && s.active !== false);
    if(!student) return;

    // 获取所有已注册的天赋名
    let talentOptions = '';
    if(window.TalentManager && typeof window.TalentManager.getRegistered === 'function') {
      const allTalents = window.TalentManager.getRegistered().filter(t => t !== '__talent_cleanup__');
      talentOptions = allTalents.map(t => {
        const has = student.talents.has(t);
        return `<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid ${has?'#48bb78':'#ddd'};border-radius:6px;cursor:pointer;font-size:12px;background:${has?'#f0fff4':'#fff'};">
          <input type="checkbox" class="cheat-talent-cb" value="${t}" ${has?'checked':''} style="margin:0;" />
          ${t}
        </label>`;
      }).join('');
    }

    safeShowModal(`
      <h3 style="margin:0 0 12px 0;">[作弊] 修改 ${student.name}</h3>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        <div>
          <label style="font-size:12px;color:#666;">压力 (0-100)</label>
          <input type="number" id="cheat-stu-pressure" value="${Math.round(student.pressure)}" min="0" max="100" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;margin-top:2px;" />
        </div>
        <div>
          <label style="font-size:12px;color:#666;">思维</label>
          <input type="number" id="cheat-stu-thinking" value="${Math.round(student.thinking)}" min="0" step="1" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;margin-top:2px;" />
        </div>
        <div>
          <label style="font-size:12px;color:#666;">代码</label>
          <input type="number" id="cheat-stu-coding" value="${Math.round(student.coding)}" min="0" step="1" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;margin-top:2px;" />
        </div>
        <div>
          <label style="font-size:12px;color:#666;">心理</label>
          <input type="number" id="cheat-stu-mental" value="${Math.round(student.mental)}" min="0" max="100" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;margin-top:2px;" />
        </div>
      </div>

      <div style="font-size:12px;color:#666;font-weight:600;margin-bottom:6px;">知识点</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px;">
        <div>
          <label style="font-size:11px;color:#888;">数据结构</label>
          <input type="number" id="cheat-stu-ds" value="${Math.round(student.knowledge_ds)}" min="0" style="width:100%;padding:4px;border:1px solid #ddd;border-radius:4px;font-size:13px;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:11px;color:#888;">图论</label>
          <input type="number" id="cheat-stu-graph" value="${Math.round(student.knowledge_graph)}" min="0" style="width:100%;padding:4px;border:1px solid #ddd;border-radius:4px;font-size:13px;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:11px;color:#888;">字符串</label>
          <input type="number" id="cheat-stu-string" value="${Math.round(student.knowledge_string)}" min="0" style="width:100%;padding:4px;border:1px solid #ddd;border-radius:4px;font-size:13px;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:11px;color:#888;">数学</label>
          <input type="number" id="cheat-stu-math" value="${Math.round(student.knowledge_math)}" min="0" style="width:100%;padding:4px;border:1px solid #ddd;border-radius:4px;font-size:13px;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:11px;color:#888;">DP</label>
          <input type="number" id="cheat-stu-dp" value="${Math.round(student.knowledge_dp)}" min="0" style="width:100%;padding:4px;border:1px solid #ddd;border-radius:4px;font-size:13px;box-sizing:border-box;" />
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-size:12px;color:#666;font-weight:600;margin-bottom:6px;">一键设置所有知识点</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn" onclick="window._cheatStuAllKP(50)" style="font-size:12px;padding:4px 10px;">全部50</button>
          <button class="btn" onclick="window._cheatStuAllKP(100)" style="font-size:12px;padding:4px 10px;">全部100</button>
          <button class="btn" onclick="window._cheatStuAllKP(200)" style="font-size:12px;padding:4px 10px;">全部200</button>
          <button class="btn" onclick="window._cheatStuAllKP(500)" style="font-size:12px;padding:4px 10px;">全部500</button>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-size:12px;color:#666;font-weight:600;margin-bottom:6px;">天赋</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;max-height:120px;overflow-y:auto;">
          ${talentOptions || '<span style="font-size:12px;color:#999;">无可用天赋</span>'}
        </div>
      </div>

      <div style="display:flex;gap:6px;margin-bottom:12px;">
        <button class="btn" onclick="window._cheatStuMaxAll()" style="font-size:12px;">一键全满</button>
        <button class="btn" onclick="window._cheatStuReset()" style="font-size:12px;background:#e53e3e;border-color:#c53030;">一键重置</button>
      </div>

      <div class="modal-actions" style="margin-top:12px;">
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn" id="cheat-stu-confirm">确认修改</button>
      </div>
    `);

    setTimeout(() => {
      const btn = document.getElementById('cheat-stu-confirm');
      if(btn) btn.onclick = () => {
        student.pressure = clampInt(parseInt(document.getElementById('cheat-stu-pressure').value)||0, 0, 100);
        student.thinking = Math.max(0, parseInt(document.getElementById('cheat-stu-thinking').value)||0);
        student.coding = Math.max(0, parseInt(document.getElementById('cheat-stu-coding').value)||0);
        student.mental = clampInt(parseInt(document.getElementById('cheat-stu-mental').value)||0, 0, 100);
        student.knowledge_ds = Math.max(0, parseInt(document.getElementById('cheat-stu-ds').value)||0);
        student.knowledge_graph = Math.max(0, parseInt(document.getElementById('cheat-stu-graph').value)||0);
        student.knowledge_string = Math.max(0, parseInt(document.getElementById('cheat-stu-string').value)||0);
        student.knowledge_math = Math.max(0, parseInt(document.getElementById('cheat-stu-math').value)||0);
        student.knowledge_dp = Math.max(0, parseInt(document.getElementById('cheat-stu-dp').value)||0);

        // 天赋
        const cbs = document.querySelectorAll('.cheat-talent-cb');
        cbs.forEach(cb => {
          if(cb.checked && !student.talents.has(cb.value)) student.talents.add(cb.value);
          if(!cb.checked && student.talents.has(cb.value)) student.talents.delete(cb.value);
        });

        cheatToast(`${student.name} 数据已修改`);
        renderAll();
        closeModalSafe();
      };
    }, 50);
  }

  // 一键全知识点
  window._cheatStuAllKP = function(v) {
    document.querySelectorAll('#cheat-stu-ds,#cheat-stu-graph,#cheat-stu-string,#cheat-stu-math,#cheat-stu-dp').forEach(el => { el.value = v; });
  };

  // 一键全满
  window._cheatStuMaxAll = function() {
    const el = id => document.getElementById(id);
    if(el('cheat-stu-pressure')) el('cheat-stu-pressure').value = 0;
    if(el('cheat-stu-thinking')) el('cheat-stu-thinking').value = 500;
    if(el('cheat-stu-coding')) el('cheat-stu-coding').value = 500;
    if(el('cheat-stu-mental')) el('cheat-stu-mental').value = 100;
    window._cheatStuAllKP(500);
    // 勾选所有天赋
    document.querySelectorAll('.cheat-talent-cb').forEach(cb => { cb.checked = true; cb.parentElement.style.borderColor = '#48bb78'; cb.parentElement.style.background = '#f0fff4'; });
  };

  // 一键重置
  window._cheatStuReset = function() {
    const el = id => document.getElementById(id);
    if(el('cheat-stu-pressure')) el('cheat-stu-pressure').value = 20;
    if(el('cheat-stu-thinking')) el('cheat-stu-thinking').value = 40;
    if(el('cheat-stu-coding')) el('cheat-stu-coding').value = 40;
    if(el('cheat-stu-mental')) el('cheat-stu-mental').value = 50;
    window._cheatStuAllKP(15);
    document.querySelectorAll('.cheat-talent-cb').forEach(cb => { cb.checked = false; cb.parentElement.style.borderColor = '#ddd'; cb.parentElement.style.background = '#fff'; });
  };

  // ===== 设施作弊 =====
  function openFacilityCheat() {
    const facDefs = {
      computer: { name: '计算机', max: 4 },
      network:  { name: '网络',   max: 3 },
      fan:      { name: '电扇',   max: 1 },
      ac:       { name: '空调',   max: 2 },
      library:  { name: '资料库', max: 4 }
    };

    let facRows = '';
    for(const [id, def] of Object.entries(facDefs)) {
      const current = game.facilities[id] || 0;
      facRows += `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="width:60px;font-size:13px;font-weight:600;">${def.name}</span>
          <span style="font-size:12px;color:#888;width:40px;">mk${current}</span>
          <input type="range" class="cheat-fac-slider" data-fac="${id}" data-max="${def.max}" min="0" max="${def.max}" value="${current}" style="flex:1;" />
          <span class="cheat-fac-val" data-fac="${id}" style="font-size:13px;font-weight:700;width:40px;text-align:center;">mk${current}</span>
          <span style="font-size:11px;color:#aaa;">/mk${def.max}</span>
        </div>`;
    }

    safeShowModal(`
      <h3 style="margin:0 0 12px 0;">[作弊] 修改设施等级</h3>
      <div style="font-size:13px;color:#555;margin-bottom:14px;">拖动滑块设置每个设施的等级（0=未建造，mkN=已建造）</div>
      ${facRows}
      <div style="display:flex;gap:6px;margin-bottom:12px;">
        <button class="btn" onclick="window._cheatFacAllMax()" style="font-size:12px;">一键满级</button>
        <button class="btn" onclick="window._cheatFacAllZero()" style="font-size:12px;background:#e53e3e;border-color:#c53030;">一键清零</button>
      </div>
      <div class="modal-actions" style="margin-top:12px;">
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn" id="cheat-fac-confirm">确认修改</button>
      </div>
    `);

    setTimeout(() => {
      // 滑块联动显示
      document.querySelectorAll('.cheat-fac-slider').forEach(slider => {
        slider.addEventListener('input', () => {
          const fac = slider.dataset.fac;
          const valEl = document.querySelector(`.cheat-fac-val[data-fac="${fac}"]`);
          if(valEl) valEl.textContent = 'mk' + slider.value;
        });
      });

      const btn = document.getElementById('cheat-fac-confirm');
      if(btn) btn.onclick = () => {
        document.querySelectorAll('.cheat-fac-slider').forEach(slider => {
          const fac = slider.dataset.fac;
          const val = parseInt(slider.value);
          game.facilities[fac] = val;
        });
        cheatToast('设施等级已修改');
        renderAll();
        closeModalSafe();
      };
    }, 50);
  }

  // 一键满级
  window._cheatFacAllMax = function() {
    document.querySelectorAll('.cheat-fac-slider').forEach(slider => {
      slider.value = slider.dataset.max;
      const valEl = document.querySelector(`.cheat-fac-val[data-fac="${slider.dataset.fac}"]`);
      if(valEl) valEl.textContent = 'mk' + slider.dataset.max;
    });
  };

  // 一键清零
  window._cheatFacAllZero = function() {
    document.querySelectorAll('.cheat-fac-slider').forEach(slider => {
      slider.value = 0;
      const valEl = document.querySelector(`.cheat-fac-val[data-fac="${slider.dataset.fac}"]`);
      if(valEl) valEl.textContent = 'mk0';
    });
  };

  // ===== 辅助：判断点击目标是否在某元素内（兼容文本节点） =====
  function isInside(el, target) {
    if(!el || !target) return false;
    if(el === target) return true;
    if(typeof el.contains === 'function') return el.contains(target);
    return false;
  }

  // ===== 全局事件委托 =====
  function initCheatListeners() {
    // 直接绑定到目标元素上，避免 closest() 在文本节点上失效
    function bindCheatClick(elId, cheatKey, openFn) {
      const el = document.getElementById(elId);
      if(!el) { console.warn('[cheat] 找不到元素 #' + elId); return; }
      el.style.cursor = 'pointer';
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        if(typeof game === 'undefined' || !game) return;
        const n = trackClick(cheatKey);
        console.log(`[作弊] ${cheatKey} 点击 #${n}`);
        if(n >= CHEAT_CLICKS) {
          counters[cheatKey].count = 0;
          cheatToast('作弊模式已触发');
          openFn();
        } else if(n >= 7) {
          cheatToast(`再点${CHEAT_CLICKS - n}次触发`);
        }
      });
    }

    // 经费
    bindCheatClick('header-budget', 'budget', openBudgetCheat);
    // 声誉
    bindCheatClick('header-reputation', 'reputation', openReputationCheat);

    // 设施状态（面板容器）
    const facPanel = document.getElementById('facilities-panel');
    if(facPanel) {
      facPanel.style.cursor = 'pointer';
      facPanel.addEventListener('click', function(e) {
        e.stopPropagation();
        if(typeof game === 'undefined' || !game) return;
        const n = trackClick('facilities');
        if(n >= CHEAT_CLICKS) {
          counters.facilities.count = 0;
          cheatToast('作弊模式已触发');
          openFacilityCheat();
        } else if(n >= 7) {
          cheatToast(`再点${CHEAT_CLICKS - n}次触发`);
        }
      });
    }

    // 学生姓名：使用事件委托（因为 renderAll 会重建 DOM）
    document.addEventListener('click', function(e) {
      if(typeof game === 'undefined' || !game) return;
      const nameEl = e.target.closest('.student-name');
      if(!nameEl) return;
      e.stopPropagation();
      // 提取学生姓名：取第一个文本节点内容，去掉 [生病] [退队倾向] 等标签
      let name = '';
      for(const node of nameEl.childNodes) {
        if(node.nodeType === 3) { // 文本节点
          name = node.textContent.trim();
          if(name) break;
        }
      }
      if(!name) return;
      const n = trackClick('student_' + name);
      if(n >= CHEAT_CLICKS) {
        counters['student_' + name] = null;
        cheatToast(`作弊模式：${name}`);
        openStudentCheat(name);
      } else if(n >= 7) {
        cheatToast(`再点${CHEAT_CLICKS - n}次触发`);
      }
    }, true); // useCapture=true，优先于其他监听器
  }

  // 等待DOM加载后初始化
  let _cheatBound = false;
  function tryInit() {
    if(_cheatBound) return true;
    const el = document.getElementById('header-budget');
    if(el) {
      _cheatBound = true;
      console.log('[作弊系统] 绑定点击事件...');
      initCheatListeners();
      // 暴露手动测试命令
      window.cheatBudget = openBudgetCheat;
      window.cheatRep = openReputationCheat;
      window.cheatFac = openFacilityCheat;
      window.cheatStudent = function(name) {
        const s = game.students.find(s => s.name === name && s.active !== false);
        if(s) openStudentCheat(name);
        else alert('找不到学生: ' + name);
      };
      window.cheatStatus = function() {
        console.log('[作弊系统] 已绑定:', _cheatBound);
        console.log('[作弊系统] 计数器:', JSON.stringify(counters));
        console.log('[作弊系统] 可用命令: cheatBudget(), cheatRep(), cheatFac(), cheatStudent("名字")');
      };
      console.log('[作弊系统] 初始化完成！点击经费/声誉10次触发，或手动调用:');
      console.log('  cheatBudget()  - 修改经费');
      console.log('  cheatRep()     - 修改声誉');
      console.log('  cheatFac()     - 修改设施');
      console.log('  cheatStudent("学生名") - 修改学生');
      console.log('  cheatStatus()  - 查看状态');
      return true;
    }
    return false;
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      let tries = 0;
      const timer = setInterval(function() {
        tries++;
        if(tryInit() || tries > 50) clearInterval(timer);
      }, 200);
    });
  } else {
    let tries = 0;
    const timer = setInterval(function() {
      tries++;
      if(tryInit() || tries > 50) clearInterval(timer);
    }, 200);
  }
})();
