const bcrypt = require('bcryptjs');
(async () => {
    const hash = await bcrypt.hash('Lei!2010', 10);
    console.log('HASH:', hash);
})();
