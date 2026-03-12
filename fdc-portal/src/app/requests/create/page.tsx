import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequests } from '@/viewmodels/useRequests';
import { RequestType, Priority } from '@/types/request';
import { REQUEST_TYPES } from '@/lib/constants';
import { FileText, Package, DollarSign, CreditCard, Calendar, ChevronRight, ArrowLeft, Check, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { cn, formatVND } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const TYPE_CARDS = [
  { type: 'material_release', icon: Package, title: 'Xuất vật tư', desc: 'Xin xuất kho vật tư y tế, văn phòng phẩm' },
  { type: 'purchase', icon: DollarSign, title: 'Mua sắm', desc: 'Đề xuất mua sắm trang thiết bị, vật tư mới' },
  { type: 'payment', icon: CreditCard, title: 'Chi tiền', desc: 'Đề nghị thanh toán hóa đơn, hợp đồng' },
  { type: 'advance', icon: DollarSign, title: 'Tạm ứng', desc: 'Xin tạm ứng tiền mặt cho công việc' },
  { type: 'leave', icon: Calendar, title: 'Nghỉ phép', desc: 'Đăng ký nghỉ phép, nghỉ ốm, công tác' },
  { type: 'other', icon: FileText, title: 'Khác', desc: 'Các đề xuất, kiến nghị khác' },
] as const;

export default function CreateRequestPage() {
  const navigate = useNavigate();
  const { createRequest } = useRequests();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<any>({
    type: '',
    title: '',
    description: '',
    priority: 'normal',
    // Material Release
    items: [],
    // Payment / Advance
    amount: '',
    beneficiary: '',
    method: 'transfer',
    expectedDate: '',
    // Leave
    leaveType: 'annual',
    startDate: '',
    endDate: '',
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => {
    if (step === 1) navigate('/requests');
    else setStep(s => s - 1);
  };

  const handleSubmit = () => {
    // Generate mock approval steps based on type
    const approvalSteps = [];
    if (formData.type === 'leave') {
      approvalSteps.push({ id: `as-${Date.now()}-1`, stepOrder: 1, approverRole: 'dept_head', status: 'pending' });
      if (formData.startDate !== formData.endDate) {
        approvalSteps.push({ id: `as-${Date.now()}-2`, stepOrder: 2, approverRole: 'director', status: 'pending' });
      }
    } else if (['purchase', 'payment', 'advance'].includes(formData.type)) {
      approvalSteps.push({ id: `as-${Date.now()}-1`, stepOrder: 1, approverRole: 'dept_head', status: 'pending' });
      approvalSteps.push({ id: `as-${Date.now()}-2`, stepOrder: 2, approverRole: 'accountant', status: 'pending' });
      approvalSteps.push({ id: `as-${Date.now()}-3`, stepOrder: 3, approverRole: 'director', status: 'pending' });
    } else {
      approvalSteps.push({ id: `as-${Date.now()}-1`, stepOrder: 1, approverRole: 'dept_head', status: 'pending' });
    }

    const totalAmount = ['purchase', 'payment', 'advance'].includes(formData.type) 
      ? (formData.type === 'purchase' ? formData.items.reduce((sum: number, i: any) => sum + (i.qty * i.price), 0) : Number(formData.amount))
      : undefined;

    const newId = createRequest({
      type: formData.type,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      totalAmount,
      approvalSteps,
      // Store extra data in description for mock purposes
      ...(formData.type === 'leave' && { description: `Từ: ${formData.startDate} Đến: ${formData.endDate}\nLý do: ${formData.description}` }),
    });

    if (newId) {
      navigate(`/requests/${newId}`);
    }
  };

  const isStep2Valid = () => {
    if (!formData.title) return false;
    if (formData.type === 'leave' && (!formData.startDate || !formData.endDate || !formData.description)) return false;
    if (['payment', 'advance'].includes(formData.type) && !formData.amount) return false;
    if (['material_release', 'purchase'].includes(formData.type) && formData.items.length === 0) return false;
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header & Stepper */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Tạo đề nghị mới</h1>
        </div>

        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full -z-10"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 rounded-full -z-10 transition-all duration-300" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
          
          {[1, 2, 3].map(s => (
            <div key={s} className="flex flex-col items-center gap-2 bg-white px-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                step > s ? "bg-indigo-600 text-white" : step === s ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-gray-100 text-gray-400"
              )}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className={cn("text-xs font-medium hidden sm:block", step >= s ? "text-indigo-900" : "text-gray-400")}>
                {s === 1 ? 'Chọn loại' : s === 2 ? 'Nhập thông tin' : 'Xác nhận'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bạn muốn tạo loại đề nghị nào?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TYPE_CARDS.map(card => {
                const Icon = card.icon;
                const isSelected = formData.type === card.type;
                return (
                  <button
                    key={card.type}
                    onClick={() => {
                      setFormData({ ...formData, type: card.type });
                      setStep(2);
                    }}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all",
                      isSelected ? "border-indigo-600 bg-indigo-50" : "border-gray-100 hover:border-indigo-200 hover:bg-gray-50"
                    )}
                  >
                    <div className={cn("p-3 rounded-lg mb-3", isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600")}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{card.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                {React.createElement(TYPE_CARDS.find(c => c.type === formData.type)?.icon || FileText, { className: "w-5 h-5" })}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{REQUEST_TYPES[formData.type as RequestType]}</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề đề nghị <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nhập tiêu đề ngắn gọn..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ ưu tiên</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="low">Thấp</option>
                    <option value="normal">Bình thường</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
                {['material_release', 'purchase'].includes(formData.type) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Khoa/Phòng yêu cầu</label>
                    <input type="text" disabled value={user?.department || 'Chung'} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
                  </div>
                )}
              </div>

              {/* Dynamic Fields based on Type */}
              {['payment', 'advance'].includes(formData.type) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="VD: 5000000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  {formData.type === 'payment' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức</label>
                      <select
                        value={formData.method}
                        onChange={e => setFormData({ ...formData, method: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      >
                        <option value="transfer">Chuyển khoản</option>
                        <option value="cash">Tiền mặt</option>
                      </select>
                    </div>
                  )}
                  {formData.type === 'advance' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngày dự kiến hoàn ứng</label>
                      <input
                        type="date"
                        value={formData.expectedDate}
                        onChange={e => setFormData({ ...formData, expectedDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {formData.type === 'leave' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại nghỉ</label>
                    <select
                      value={formData.leaveType}
                      onChange={e => setFormData({ ...formData, leaveType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="annual">Nghỉ phép năm</option>
                      <option value="sick">Nghỉ ốm</option>
                      <option value="unpaid">Nghỉ không lương</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  {formData.startDate && formData.endDate && formData.startDate !== formData.endDate && (
                    <div className="col-span-full p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800 text-sm">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p>Nghỉ nhiều ngày liên tiếp sẽ cần sự phê duyệt của Giám đốc.</p>
                    </div>
                  )}
                </div>
              )}

              {['material_release', 'purchase'].includes(formData.type) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Danh sách vật tư <span className="text-red-500">*</span></label>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, items: [...formData.items, { name: '', qty: 1, unit: '', price: 0 }] })}
                      className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-700"
                    >
                      <Plus className="w-4 h-4" /> Thêm dòng
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-3 py-2 font-medium">Tên vật tư</th>
                          <th className="px-3 py-2 font-medium w-20">SL</th>
                          <th className="px-3 py-2 font-medium w-24">ĐVT</th>
                          {formData.type === 'purchase' && <th className="px-3 py-2 font-medium w-32">Đơn giá</th>}
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {formData.items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-1"><input type="text" value={item.name} onChange={e => { const newItems = [...formData.items]; newItems[idx].name = e.target.value; setFormData({...formData, items: newItems}) }} className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-indigo-500 outline-none" placeholder="Tên..." /></td>
                            <td className="p-1"><input type="number" value={item.qty} onChange={e => { const newItems = [...formData.items]; newItems[idx].qty = Number(e.target.value); setFormData({...formData, items: newItems}) }} className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-indigo-500 outline-none" /></td>
                            <td className="p-1"><input type="text" value={item.unit} onChange={e => { const newItems = [...formData.items]; newItems[idx].unit = e.target.value; setFormData({...formData, items: newItems}) }} className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-indigo-500 outline-none" placeholder="Hộp..." /></td>
                            {formData.type === 'purchase' && (
                              <td className="p-1"><input type="number" value={item.price} onChange={e => { const newItems = [...formData.items]; newItems[idx].price = Number(e.target.value); setFormData({...formData, items: newItems}) }} className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-indigo-500 outline-none" placeholder="Giá..." /></td>
                            )}
                            <td className="p-1 text-center">
                              <button onClick={() => { const newItems = formData.items.filter((_:any, i:number) => i !== idx); setFormData({...formData, items: newItems}) }} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {formData.items.length === 0 && (
                          <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">Chưa có vật tư nào. Bấm "Thêm dòng" để bắt đầu.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {formData.type === 'purchase' && formData.items.length > 0 && (
                    <div className="text-right text-sm font-medium text-gray-900 mt-2">
                      Tổng cộng: {formatVND(formData.items.reduce((sum: number, i: any) => sum + (i.qty * i.price), 0))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.type === 'leave' ? 'Lý do nghỉ' : 'Mô tả chi tiết'} {formData.type === 'leave' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nhập chi tiết..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={handleNext}
                disabled={!isStep2Valid()}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tiếp tục <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Tóm tắt đề nghị</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div>
                  <dt className="text-gray-500">Loại đề nghị</dt>
                  <dd className="font-medium text-gray-900">{REQUEST_TYPES[formData.type as RequestType]}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Tiêu đề</dt>
                  <dd className="font-medium text-gray-900">{formData.title}</dd>
                </div>
                {formData.amount && (
                  <div>
                    <dt className="text-gray-500">Số tiền</dt>
                    <dd className="font-medium text-gray-900">{formatVND(Number(formData.amount))}</dd>
                  </div>
                )}
                {formData.type === 'leave' && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500">Thời gian nghỉ</dt>
                    <dd className="font-medium text-gray-900">{formData.startDate} đến {formData.endDate}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Mô tả / Lý do</dt>
                  <dd className="font-medium text-gray-900 whitespace-pre-wrap">{formData.description}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quy trình duyệt dự kiến</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">1</div>
                  <span className="font-medium text-gray-900">Trưởng khoa/phòng</span>
                </div>
                {['purchase', 'payment', 'advance'].includes(formData.type) && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">2</div>
                    <span className="font-medium text-gray-900">Kế toán trưởng</span>
                  </div>
                )}
                {(['purchase', 'payment', 'advance'].includes(formData.type) || (formData.type === 'leave' && formData.startDate !== formData.endDate)) && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">3</div>
                    <span className="font-medium text-gray-900">Giám đốc</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleBack}
                className="px-6 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Quay lại
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                <Check className="w-5 h-5" /> Gửi đề nghị
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
