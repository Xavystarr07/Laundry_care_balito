<?php
// partials/banking.php — Banking details rows (inside the statement <table>)
// Edit bank name / account number in php/settings.php (BH_BANK)
?>
<tr><td colspan="3" class="banking-title">Banking Details</td></tr>
<?php foreach (BH_BANK as $label => $value): ?>
<tr><td colspan="3" class="banking-detail"><?= htmlspecialchars($label . ': ' . $value, ENT_QUOTES, 'UTF-8') ?></td></tr>
<?php endforeach; ?>
