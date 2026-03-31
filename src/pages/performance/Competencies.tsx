import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Target } from 'lucide-react';

export default function Competencies() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-solarized-base02">Competencies</h1>
                <p className="text-solarized-base01">Manage employee competencies and skill assessments</p>
            </div>

            <Card className="border-0 shadow-md">
                <CardHeader>
                    <CardTitle>Competency Framework</CardTitle>
                    <CardDescription>Define and track employee competencies</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <Target className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-solarized-base02">
                            Coming Soon
                        </h3>
                        <p className="text-solarized-base01 mt-1">
                            The competency management feature is under development.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
