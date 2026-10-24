<?php
// partials/header.php — Business name, address, contact (from php/settings.php)
$b = BH_BUSINESS;
$h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
?>
<div class="header">
    <div class="left">
        <h1><?= $h($b['name']) ?></h1>
        <?php foreach ($b['address'] as $line): ?><p><?= $h($line) ?></p><?php endforeach; ?>
    </div>
    <div class="right">
        <p><?= $h($b['web']) ?></p>
        <?php foreach ($b['emails'] as $line): ?><p><?= $h($line) ?></p><?php endforeach; ?>
        <?php foreach ($b['phones'] as $line): ?><p><?= $h($line) ?></p><?php endforeach; ?>
    </div>
</div>
