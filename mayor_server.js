const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const xlsx = require('xlsx');
const fs = require('fs');
const { resolve } = require('path');
const { reject } = require('async');

const app = express();

const dbfile = 'mayor_data.db';

// 讀excel檔資料
const workbook = xlsx.readFile('new_excel.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

// 資料庫
const db = new sqlite3.Database(dbfile);

// 創 db 
if ( !fs.existsSync(dbfile) ){
db.serialize(() => 
{
  db.run('CREATE TABLE regions (id INTEGER PRIMARY KEY, name TEXT)');
  db.run('CREATE TABLE candidates (id INTEGER PRIMARY KEY, name TEXT, region_name TET, votes INTEGER, region_id INTEGER, FOREIGN KEY(region_id) REFERENCES regions(id))');

  // 放進資料
  const regions = new Set();
  data.forEach(row => {
    regions.add(row.region_name);
    db.run(`INSERT INTO candidates (name, region_name, votes, region_id) VALUES ('${row.name}', '${row.region_name}', ${row.votes}, ${row.region_id})`);
  });

  regions.forEach(region_name => {
    db.run(`INSERT INTO regions (name) VALUES ('${region_name}')`);
  });
}
);
}
// else{
//   console.log(111);
// }

// 確認該路徑能運行
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// 取出 db 資料
// 定義一個路由，當收到 GET /regions 的請求時執行以下程式碼
app.get('/region_data', (req, res) => {
  // 從資料庫中選取所有的 regions 資料
  db.all('SELECT * FROM regions', (err, regions) => {
    // 如果發生錯誤，回傳 500 錯誤訊息
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    } else {
      // 將每個 region 資料都轉換成一個 Promise 物件
      const promises = regions.map(region => {
        return new Promise((resolve, reject) => {
          // 從資料庫中選取符合 region_id 的 candidates 資料
          db.all(`SELECT * FROM candidates WHERE region_id = ${region.id}`, (err, candidates) => {
            if (err) {
              // 如果發生錯誤，拒絕 Promise
              reject(err);
            } else {
              // 如果成功，解決 Promise，回傳包含 region 資料和 candidates 資料的物件
              resolve({
                id: region.id,
                name: region.name,
                candidates: candidates
              });
            }
          });
        });
      });

      // 等待所有 Promise 都解決後，回傳包含所有 region 資料和 candidates 資料的陣列
      Promise.all(promises).then(results => {
        res.json(results);
      }).catch(err => {
        // 如果發生錯誤，回傳 500 錯誤訊息
        console.error(err);
        res.status(500).send('Internal Server Error');
      });
    }
  });
});

app.use(express.json())

app.post('/post_data', (req, res) => {
  const { name, votes } = req.body;
  new Promise((resolve, reject) => {
    db.run(`UPDATE candidates SET votes = ${votes} WHERE name ='${name}'`, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  }).then(() => {
    res.send('Data inserted into database');
    console.log(`'${name}', ${votes}`);
  }).catch((err) => {
    console.error(err.message);
    res.status(500).send('Error inserting data into database');
  });
});



















process.on('SIGINT',() =>{
  console.log('SIGNT recieved.');
  server.close(()=>{
    console.log("server is closed");
    process.exit(0);
  })
});

// server啟動確認
const server = app.listen(3000, () => {
  console.log('Server started on port 3000');
});

