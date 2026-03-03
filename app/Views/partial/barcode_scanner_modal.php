<?php
/**
 * @var string $controller_name
 */
?>

<div class="modal fade" id="barcodeScannerModal" tabindex="-1" role="dialog" aria-labelledby="barcodeScannerModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
                <h4 class="modal-title" id="barcodeScannerModalLabel">
                    <?= lang(ucfirst($controller_name) . '.scan_barcode') ?>
                </h4>
            </div>
            <div class="modal-body">
                <div id="barcode_scanner_reader"></div>
                <p id="barcode_scanner_status" class="text-center" style="margin-top: 10px;"></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">
                    <?= lang('Common.close') ?>
                </button>
            </div>
        </div>
    </div>
</div>
