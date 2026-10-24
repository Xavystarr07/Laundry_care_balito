<?php
// partials/header.php — Business name, address, contact, recipient, title
// Everything comes from php/settings.php (edit it there)
$b = BH_BUSINESS;
$e = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
?>
<div class="header-info">
    <div class="business-info">
        <h1><?= $e($b['name']) ?></h1>
        <?php foreach ($b['address'] as $line): ?><p><?= $e($line) ?></p><?php endforeach; ?>
    </div>
    <div class="contact-info">
        <?php foreach ($b['emails'] as $line): ?><p>Email: <?= $e($line) ?></p><?php endforeach; ?>
        <a href="https://<?= $e($b['web']) ?>" target="_blank"><?= $e($b['web']) ?></a>
        <?php foreach ($b['phones'] as $line): ?><p><?= $e($line) ?></p><?php endforeach; ?>
    </div>
</div>

<div class="recipient-info">
    <p><strong>To:</strong> <?= $e(BH_STATEMENT_TO[0]) ?></p>
    <?php foreach (array_slice(BH_STATEMENT_TO, 1) as $line): ?><p><?= $e($line) ?></p><?php endforeach; ?>
</div>

<h2 class="statement-title"><u>Monthly Statement</u></h2>
<p class="tagline">"<?= $e($b['tagline']) ?>"</p>
