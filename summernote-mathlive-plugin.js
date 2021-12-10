/**
 *
 * copyright:  Copyright (c) 2021, Stanislav Filev
 * email: me@stenli.com
 * license: https://opensource.org/licenses/MIT MIT
 *
 */
(function (factory) {
  /* Global define */
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node/CommonJS
    module.exports = factory(require('jquery'));
  } else {
    // Browser globals
    factory(window.jQuery);
  }
}(function ($) {
/**
 * @class plugin.mathlivePlugin
 *
 * mathlive Plugin
*/

	$.extend(true, $.summernote.lang, {
		'en-US': {
		  math:{
			pluginTitle:'Insert math equation',
			dialogTitle:'Insert math equation',
			tooltip:'Math equation',
			addTooltip:'Insert math equation',
			editTooltip:'Edit math equation',
			ok:'Insert',
			cancel:'Cancel'
		  }			
		},
		'bg-BG': {
		  math:{
			pluginTitle:'Добавяне на математическа формула',
			dialogTitle:'Добавяне на математическа формула',
			tooltip:'Mатематическа формула',
			addTooltip:'Добавяне на математическа формула',
			editTooltip:'Редактиране на математическа формула',
			ok:'Добави',
			cancel:'Отмени'
		  }			
		},
	});	


    $.extend($.summernote.options,{
        math:{
            icon:'<i class="far fa-function">&#8512;</i>'
        }
    });
    $.extend($.summernote.plugins,{
        'math':function(context){
            var self=this;
            var ui=$.summernote.ui;
            //var $note=context.layoutInfo.note;
            var $editor=context.layoutInfo.editor;
            var $editable=context.layoutInfo.editable;
            var options=context.options;
            var lang=options.langInfo;

            self.events = {
                'summernote.keyup summernote.mouseup summernote.change summernote.scroll': () => {
                    self.update();
                },
                'summernote.disable summernote.dialog.shown': () => {
                    self.hide();
                },
            };

            context.memo('button.math',function(){
                let button=ui.button({
                    contents:options.math.icon,
                    tooltip:lang.math.tooltip,
                    className: 'note-btn-add-math',
                    click:function(e){
                        // Cursor position must be saved because is lost when popup is opened.
                        context.invoke('editor.saveRange');
                        context.invoke('math.show');
                    }
                });
                return button.render();
            });

            self.initialize = function(){

                let $container=options.dialogsInBody?$(document.body):$editor;
                let body=`<div class="math-form form-group">

                    <p>Insert math equation here: </p>
                    <div style="border: 1px solid #c2cad8;">
                        <math-field class="summernote-formula" virtual-keyboard-mode="manual"></math-field>
                        <input type="hidden" class="form-control math-input">
                    </div>                    
                    <p>Preview: </p>
                    <div><span class="preview-latex"></span></div>
                    
                    <script>
                        var mathFields = $('.summernote-formula');
                        mathFields.on('input', function (e) {
                            let latexField = $(this).closest('.math-form').find('.math-input');
                            let latexPreview = $(this).closest('.math-form').find('.preview-latex');
                            latexField.val($(this).val());
                            latexPreview.text($(this).val());
                        });                    
                    </script>

                    </div>`;

                self.$dialog=ui.dialog({
                    title:lang.math.dialogTitle,
                    body:body,
                    footer:'<button class="btn default" data-dismiss="modal">'+lang.math.cancel+'</button>' +
                        '<button class="btn btn-primary note-math-btn">'+lang.math.ok+'</button>'
                }).render().appendTo($container);

                self.$popover = ui.popover({
                    className: 'note-math-popover'
                }).render().appendTo(options.container);
                const $content = self.$popover.find('.popover-content,.note-popover-content');
                context.invoke('buttons.build', $content, ['math']);
                self.handleMathFieldClick();
            };

            self.handleMathFieldClick = function (){
                $editable.find('.summernote-formula').on('click',function () {
                    self.showPopover(this);
                });
            };

            self.showPopover = function (node){
                const mathVal = $(node).val();

                if (mathVal.length !== 0) {
                    self.$popover.find('button').html(lang.math.editTooltip);
                } else {
                    self.$popover.find('button').html(lang.math.addTooltip);
                }
                const pos = $.summernote.dom.posFromPlaceholder(node);
                self.$popover.css({
                    display: 'block',
                    left: pos.left,
                    top: pos.top,
                });
            };

            self.update = function() {
                // Prevent focusing on editable when invoke('code') is executed
                if (!context.invoke('editor.hasFocus')) {
                    self.hide();
                    return;
                }

                self.hide();
            };

            self.hide = function() {
                self.$popover.hide();
            };

            self.destroy = function(){
                ui.hideDialog(this.$dialog);
                self.$dialog.remove();
                self.$popover.remove();
            };

            self.bindEnterKey = function($input,$btn){
                $input.on('keypress',function(event){
                    if (event.keyCode === 13) {
                        $btn.trigger('click');
                    }

                });
            };

            self.bindLabels = function(){
                self.$dialog.find('.form-control:first').focus().select();
                self.$dialog.find('label').on('click',function(){
                    $(this).parent().find('.form-control:first').focus();
                });
            };

            self.show = function(){
                let $summernoteFormula = self.$dialog.find('.summernote-formula');
                let $mathInput = self.$dialog.find('.math-input');
                let $selectedMathNode = self.getSelectedMath();

                if ($selectedMathNode === null) {
                    // reset the dialog input and math
                    $summernoteFormula.val('');
                    $mathInput.val('');
                }
                else { // edit the selected math node
                    let mathVal = $selectedMathNode.find('.summernote-formula').val();
                    $summernoteFormula.val(mathVal);
                    $mathInput.val(mathVal);
                }

                let mathInfo = {}; // not used

                self.showMathDialog(mathInfo).then(function(mathInfo){
                    ui.hideDialog(self.$dialog);
                    let $mathNodeClone = $summernoteFormula.clone();

                    $mathNodeClone.removeAttr('virtual-keyboard-mode');
                    $mathNodeClone.val($mathInput.val());
                    $mathNodeClone.text($mathInput.val());

                    let $formulaHolder = $('<div>');
                    $formulaHolder.addClass('formula-holder');
                    $mathNodeClone.appendTo($formulaHolder);

                    // We restore cursor position and element is inserted in correct pos.
                    context.invoke('editor.restoreRange');
                    context.invoke('editor.focus');

                    if ($selectedMathNode === null)
                        context.invoke('editor.insertNode',$formulaHolder[0]);
                    else {// if we are editing an existing mathNode, just replace the contents:
                        if( $.trim( $mathInput.val() ) == '' ) { // unless there's nothing there, then delete the node
                            $selectedMathNode.remove()
                        }
                        else {
                            $selectedMathNode.html($mathNodeClone);
                        }
                    }
                    self.handleMathFieldClick();
                });
            };

            self.showMathDialog = function(editorInfo) {
                return $.Deferred(function (deferred) {
                    let $editBtn = self.$dialog.find('.note-math-btn');
                    ui.onDialogShown(self.$dialog, function () {
                        context.triggerEvent('dialog.shown');
                        $editBtn.click(function (e) {
                            e.preventDefault();
                            deferred.resolve({

                            });
                        });
                        self.bindEnterKey($editBtn);
                        self.bindLabels();
                    });
                    ui.onDialogHidden(self.$dialog, function () {
                        $editBtn.off('click');
                        if (deferred.state() === 'pending') deferred.reject();
                    });
                    self.$dialog.modal({ backdrop: 'static', keyboard: false }, 'show');
                });
            };

            self.getSelectedMath = function() {
                let selection = window.getSelection();
                if( selection ){
                    // get all math nodes
                    let $selectedMathNode = null;
                    let $mathNodes = $('.formula-holder');
                    $mathNodes.each(function() {
                        // grab first math node in the selection (including partial).
                        if(selection.anchorNode === this) {
                            $selectedMathNode = $(this);
                        }
                    });
                    return $selectedMathNode;
                }
            };

        }
    });
}));