// Quick test to see what data is returned
fetch('http://localhost:8081/api/v1/company/sales/search-dealers?limit=50', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(r => r.json())
.then(d => console.log(JSON.stringify(d, null, 2)))
.catch(e => console.error(e));
