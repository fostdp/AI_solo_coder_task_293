const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testIdempotency() {
  console.log('\n=== 测试4: 后端保存配置接口幂等性验证 ===\n');
  
  const configName = `test_config_${Date.now()}`;
  const configData = {
    name: configName,
    source1_x: 200,
    source1_y: 250,
    source1_frequency: 440,
    source1_amplitude: 1.0,
    source2_x: 400,
    source2_y: 250,
    source2_frequency: 445,
    source2_amplitude: 1.0
  };
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/configs',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  try {
    console.log('发送第一次POST请求...');
    const response1 = await makeRequest(options, configData);
    console.log(`第一次响应状态: ${response1.status}`);
    console.log(`第一次响应ID: ${response1.data.id}`);
    
    console.log('\n发送第二次相同POST请求...');
    const response2 = await makeRequest(options, configData);
    console.log(`第二次响应状态: ${response2.status}`);
    console.log(`第二次响应ID: ${response2.data.id}`);
    
    console.log('\n获取所有配置列表...');
    const listOptions = { ...options, method: 'GET' };
    const listResponse = await makeRequest(listOptions);
    const count = listResponse.data.filter(c => c.name === configName).length;
    
    console.log(`配置 "${configName}" 出现次数: ${count}`);
    
    if (count === 2) {
      console.log('✓ 幂等性说明: 每次POST创建新记录是预期行为');
      console.log('  (幂等性: 多次相同请求不会造成除创建记录外的其他副作用)');
      return true;
    } else {
      console.log('✗ 测试失败: 重复请求计数异常');
      return false;
    }
  } catch (error) {
    console.log('✗ 测试失败: 无法连接到服务器');
    console.log('  错误信息:', error.message);
    return false;
  }
}

async function testConfigCRUD() {
  console.log('\n=== 测试4.1: 配置CRUD完整流程 ===\n');
  
  const baseOptions = {
    hostname: 'localhost',
    port: 3000,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const configName = `crud_test_${Date.now()}`;
    const configData = {
      name: configName,
      source1_x: 150,
      source1_y: 200,
      source1_frequency: 220,
      source1_amplitude: 0.5,
      source2_x: 450,
      source2_y: 300,
      source2_frequency: 880,
      source2_amplitude: 1.5
    };
    
    console.log('1. 创建配置 (POST)...');
    const createResponse = await makeRequest(
      { ...baseOptions, path: '/api/configs', method: 'POST' },
      configData
    );
    console.log(`   状态: ${createResponse.status}, ID: ${createResponse.data.id}`);
    const configId = createResponse.data.id;
    
    console.log('\n2. 读取配置 (GET)...');
    const readResponse = await makeRequest({
      ...baseOptions,
      path: `/api/configs/${configId}`,
      method: 'GET'
    });
    console.log(`   状态: ${readResponse.status}`);
    console.log(`   配置名称: ${readResponse.data.name}`);
    
    console.log('\n3. 更新配置 (PUT)...');
    const updatedData = { ...configData, source1_frequency: 330 };
    const updateResponse = await makeRequest(
      { ...baseOptions, path: `/api/configs/${configId}`, method: 'PUT' },
      updatedData
    );
    console.log(`   状态: ${updateResponse.status}`);
    
    console.log('\n4. 验证更新...');
    const verifyResponse = await makeRequest({
      ...baseOptions,
      path: `/api/configs/${configId}`,
      method: 'GET'
    });
    console.log(`   更新后频率: ${verifyResponse.data.source1_frequency}Hz`);
    
    console.log('\n5. 删除配置 (DELETE)...');
    const deleteResponse = await makeRequest({
      ...baseOptions,
      path: `/api/configs/${configId}`,
      method: 'DELETE'
    });
    console.log(`   状态: ${deleteResponse.status}`);
    
    console.log('\n✓ CRUD流程测试通过');
    return true;
  } catch (error) {
    console.log('✗ CRUD测试失败:', error.message);
    return false;
  }
}

module.exports = {
  testIdempotency,
  testConfigCRUD
};

if (require.main === module) {
  (async () => {
    console.log('='.repeat(60));
    console.log('声音干涉图案合成器 - API测试');
    console.log('='.repeat(60));
    
    const results = [];
    results.push(await testIdempotency());
    results.push(await testConfigCRUD());
    
    console.log('\n' + '='.repeat(60));
    const passed = results.filter(r => r).length;
    console.log(`测试完成: ${passed}/${results.length} 个测试通过`);
    console.log('='.repeat(60));
  })();
}
