import { type FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLoan } from '../hooks/useLoans';
import { LoanFormComponent } from '../components/LoanForm';

const LoanFormPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { data: loan, isLoading } = useLoan(id!);

  if (isEditing && isLoading) {
    return (
      <div>
        <button onClick={() => navigate('/loans')} className="text-sm text-primary-600 hover:underline flex items-center mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </button>
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-6" />
        <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isEditing && !loan) {
    navigate('/loans');
    return null;
  }

  return (
    <div>
      <button
        onClick={() => navigate('/loans')}
        className="text-sm text-primary-600 hover:underline flex items-center mb-4 p-2 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Volver
      </button>
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">
        {isEditing ? 'Editar Préstamo' : 'Nuevo Préstamo'}
      </h2>
      <LoanFormComponent loan={loan} />
    </div>
  );
};

export default LoanFormPage;
