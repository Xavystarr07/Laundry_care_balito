<?php
$f = __DIR__ . '/js/print.js';
echo $f . '<br>last saved: ' . date('Y-m-d H:i:s', filemtime($f)) .
     '<br>has printFrame: ' . (strpos(file_get_contents($f), 'printFrame') !== false ? 'YES' : 'NO');