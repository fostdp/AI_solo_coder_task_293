const assert = require('assert');

function calculateInterferencePoint(x1, y1, x2, y2, x, y, wavelength) {
  const dx1 = x - x1;
  const dy1 = y - y1;
  const distance1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  
  const dx2 = x - x2;
  const dy2 = y - y2;
  const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  
  const phase1 = (2 * Math.PI * distance1) / wavelength;
  const phase2 = (2 * Math.PI * distance2) / wavelength;
  
  return Math.sin(phase1) + Math.sin(phase2);
}

function findFringeSpacing(source1, source2, wavelength) {
  const centerX = (source1.x + source2.x) / 2;
  const centerY = (source1.y + source2.y) / 2;
  const d = Math.sqrt(
    Math.pow(source2.x - source1.x, 2) + 
    Math.pow(source2.y - source1.y, 2)
  );
  
  const fringes = [];
  let prevPressure = null;
  
  for (let y = centerY - 200; y < centerY + 200; y += 1) {
    const pressure = calculateInterferencePoint(
      source1.x, source1.y, source2.x, source2.y,
      centerX, y, wavelength
    );
    
    if (prevPressure !== null) {
      if ((prevPressure < 0 && pressure >= 0) || (prevPressure >= 0 && pressure < 0)) {
        fringes.push(y);
      }
    }
    prevPressure = pressure;
  }
  
  if (fringes.length >= 2) {
    const spacings = [];
    for (let i = 1; i < fringes.length; i++) {
      spacings.push(Math.abs(fringes[i] - fringes[i-1]));
    }
    return spacings.reduce((a, b) => a + b, 0) / spacings.length;
  }
  
  return null;
}

function testInterferenceTheory() {
  console.log('\n=== 测试1: 波干涉条纹间隔与理论波长验证 ===\n');
  
  const wavelength = 50;
  const source1 = { x: 200, y: 250 };
  const source2 = { x: 400, y: 250 };
  
  const d = source2.x - source1.x;
  const avgSpacing = findFringeSpacing(source1, source2, wavelength);
  
  console.log(`声源间距 d = ${d}px`);
  console.log(`波长 λ = ${wavelength}px`);
  
  const theoreticalSpacing = wavelength;
  console.log(`理论条纹间隔: ${theoreticalSpacing.toFixed(2)}px`);
  console.log(`实际测量条纹间隔: ${avgSpacing ? avgSpacing.toFixed(2) : 'N/A'}px`);
  
  if (avgSpacing) {
    const error = Math.abs(avgSpacing - theoreticalSpacing) / theoreticalSpacing * 100;
    console.log(`误差: ${error.toFixed(2)}%`);
    
    if (error < 10) {
      console.log('✓ 测试通过: 条纹间隔与理论值一致');
      return true;
    } else {
      console.log('✗ 测试失败: 条纹间隔误差较大');
      return false;
    }
  }
  return false;
}

function testPhaseDifference() {
  console.log('\n=== 测试1.1: 相位差计算验证 ===\n');
  
  const wavelength = 50;
  const source1 = { x: 200, y: 250 };
  const source2 = { x: 400, y: 250 };
  
  const midpoint = { x: 300, y: 250 };
  const pressure = calculateInterferencePoint(
    source1.x, source1.y, source2.x, source2.y,
    midpoint.x, midpoint.y, wavelength
  );
  
  console.log(`中点坐标: (${midpoint.x}, ${midpoint.y})`);
  console.log(`到声源1距离: ${Math.sqrt(Math.pow(midpoint.x - source1.x, 2) + Math.pow(midpoint.y - source1.y, 2)).toFixed(2)}`);
  console.log(`到声源2距离: 相同`);
  console.log(`声压叠加值: ${pressure.toFixed(4)}`);
  
  const expected = 2;
  const error = Math.abs(pressure - expected);
  
  if (error < 0.01) {
    console.log('✓ 测试通过: 中点相长干涉正确');
    return true;
  } else {
    console.log('✗ 测试失败: 中点声压计算错误');
    return false;
  }
}

module.exports = {
  testInterferenceTheory,
  testPhaseDifference
};

if (require.main === module) {
  console.log('='.repeat(60));
  console.log('声音干涉图案合成器 - 单元测试');
  console.log('='.repeat(60));
  
  const results = [];
  results.push(testInterferenceTheory());
  results.push(testPhaseDifference());
  
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r).length;
  console.log(`测试完成: ${passed}/${results.length} 个测试通过`);
  console.log('='.repeat(60));
}
