(function(barcode_scanner, $) {

    var scanner = null;
    var isScanning = false;
    var modalCreated = false;

    var isSupported = function() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    };

    var ensureModal = function() {
        if (modalCreated || $('#barcodeScannerModal').length) return;

        var modalHtml =
            '<div class="modal fade" id="barcodeScannerModal" tabindex="-1" role="dialog">' +
                '<div class="modal-dialog" role="document">' +
                    '<div class="modal-content">' +
                        '<div class="modal-header">' +
                            '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
                                '<span aria-hidden="true">&times;</span>' +
                            '</button>' +
                            '<h4 class="modal-title">Scan Barcode</h4>' +
                        '</div>' +
                        '<div class="modal-body">' +
                            '<div id="barcode_scanner_reader"></div>' +
                            '<p id="barcode_scanner_status" class="text-center" style="margin-top:10px;"></p>' +
                        '</div>' +
                        '<div class="modal-footer">' +
                            '<button type="button" class="btn btn-default" data-dismiss="modal">' +
                                (window.lang && lang.line ? lang.line('common_close') : 'Close') +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        $('body').append(modalHtml);
        modalCreated = true;
    };

    /**
     * Initialize scanner for register/receiving pages.
     * Shows #barcode_scanner_li button, scans into inputId, submits formId.
     */
    var init = function(formId, inputId) {
        if (!isSupported()) {
            $('#barcode_scanner_li').hide();
            return;
        }

        $('#barcode_scanner_li').show();

        $('#barcode_scanner_btn').off('click').on('click', function(e) {
            e.preventDefault();
            openScanner(inputId, formId);
        });
    };

    /**
     * Bind a custom button to scan into a target input (no form submit).
     * Use this for AJAX-loaded forms like item edit dialogs.
     */
    var bind = function(buttonSelector, inputSelector) {
        if (!isSupported()) {
            $(buttonSelector).hide();
            return;
        }

        $(buttonSelector).show();

        $(buttonSelector).off('click').on('click', function(e) {
            e.preventDefault();
            openScanner(inputSelector, null);
        });
    };

    var openScanner = function(inputId, formId) {
        ensureModal();

        var $modal = $('#barcodeScannerModal');

        $modal.off('shown.bs.modal').on('shown.bs.modal', function() {
            startScanning(inputId, formId);
        });

        $modal.off('hidden.bs.modal').on('hidden.bs.modal', function() {
            stopScanning();
        });

        $modal.modal('show');
    };

    var startScanning = function(inputId, formId) {
        if (isScanning) return;

        $('#barcode_scanner_status').text('').removeClass('text-danger');

        scanner = new Html5Qrcode("barcode_scanner_reader");

        scanner.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 280, height: 140 },
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.CODE_93,
                    Html5QrcodeSupportedFormats.CODABAR,
                    Html5QrcodeSupportedFormats.ITF,
                    Html5QrcodeSupportedFormats.QR_CODE
                ]
            },
            function onScanSuccess(decodedText) {
                handleScanResult(decodedText, inputId, formId);
            },
            function onScanFailure() {
                // No barcode in frame — normal, ignore
            }
        ).then(function() {
            isScanning = true;
        }).catch(function() {
            $('#barcode_scanner_status')
                .text('Camera access denied or unavailable.')
                .addClass('text-danger');
        });
    };

    var handleScanResult = function(decodedText, inputId, formId) {
        stopScanning();
        $('#barcodeScannerModal').modal('hide');
        $(inputId).val(decodedText);
        if (formId) {
            $(formId).submit();
        }
    };

    var stopScanning = function() {
        if (scanner && isScanning) {
            scanner.stop().then(function() {
                scanner.clear();
                isScanning = false;
            }).catch(function() {
                isScanning = false;
            });
        }
    };

    $.extend(barcode_scanner, {
        init: init,
        bind: bind,
        isSupported: isSupported
    });

})(window.barcode_scanner = window.barcode_scanner || {}, jQuery);
